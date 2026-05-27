import { HttpsError, onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import {
  CandidatePostulationCVPayload,
  CandidatePostulationPayload,
  ConfirmCandidateProfilePayload,
} from '@ats/shared-types';

import { CandidateRegistrationCVService } from '../services/candidateService';
import {
  CandidateRegistrationConflictError,
  CandidateRegistrationService,
} from '../services/candidateService';
import {
  validateRegisterCandidatePayload,
  validateStartApplicationWithCVPayload,
} from '../validators/candidateValidator';
import { auth } from '../core/firebaseAdmin';

type AuthContext = {
  uid?: string;
  token?: {
    uid?: string;
    user_id?: string;
    sub?: string;
  };
};

function sendError(
  response: Parameters<Parameters<typeof onRequest>[0]>[1],
  error: unknown,
  fallbackMessage: string,
): void {
  if (error instanceof HttpsError) {
    const statusByCode: Partial<Record<typeof error.code, number>> = {
      'invalid-argument': 400,
      unauthenticated: 401,
      'permission-denied': 403,
      'not-found': 404,
      'already-exists': 409,
      'failed-precondition': 412,
    };

    response
      .status(statusByCode[error.code] ?? 500)
      .json({ error: error.message, code: error.code });
    return;
  }

  response.status(500).json({ error: fallbackMessage, code: 'internal' });
}

function setCorsHeaders(
  response: Parameters<Parameters<typeof onRequest>[0]>[1],
): void {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

function assertPostMethod(
  request: Parameters<Parameters<typeof onRequest>[0]>[0],
  response: Parameters<Parameters<typeof onRequest>[0]>[1],
): boolean {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return false;
  }

  if (request.method !== 'POST') {
    response.status(405).json({
      error: 'Method not allowed. Use POST.',
      code: 'method-not-allowed',
    });
    return false;
  }

  return true;
}

function getPayload<T>(requestBody: unknown): Partial<T> {
  if (
    typeof requestBody === 'object' &&
    requestBody !== null &&
    'data' in requestBody
  ) {
    return (requestBody as { data: Partial<T> }).data;
  }

  return requestBody as Partial<T>;
}

async function getAuthContext(
  request: Parameters<Parameters<typeof onRequest>[0]>[0],
): Promise<AuthContext> {
  const authorization = request.header('authorization') ?? '';
  const match = authorization.match(/^Bearer (.+)$/i);

  if (!match) {
    throw new HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado.',
    );
  }

  const decodedToken = await auth.verifyIdToken(match[1]);

  return {
    uid: decodedToken.uid,
    token: {
      uid: decodedToken.uid,
      user_id: decodedToken.user_id as string | undefined,
      sub: decodedToken.sub,
    },
  };
}

function resolveCandidateId(authContext: AuthContext): string {
  const candidateId =
    authContext.uid ||
    authContext.token?.uid ||
    authContext.token?.user_id ||
    authContext.token?.sub;

  if (!candidateId) {
    logger.error('No se pudo resolver candidateId desde authContext', {
      auth: authContext,
    });

    throw new HttpsError(
      'unauthenticated',
      'No se pudo identificar al usuario autenticado.',
    );
  }
  return candidateId;
}

const candidateRegistrationCVService = new CandidateRegistrationCVService();
export const registerCandidateCV = onRequest(async (request, response) => {
  if (!assertPostMethod(request, response)) {
    return;
  }

  try {
    const authContext = await getAuthContext(request);
    const candidateId = resolveCandidateId(authContext);
    const payload = getPayload<CandidatePostulationCVPayload>(request.body);
    validateStartApplicationWithCVPayload(payload);

    const result = await candidateRegistrationCVService.registerCandidateCV(
      candidateId,
      payload,
    );

    response.status(200).json(result);
  } catch (error) {
    logger.error('Error inesperado iniciando postulación por CV', error);
    sendError(response, error, 'No se pudo iniciar la postulación por CV.');
  }
});

const candidateRegistrationService = new CandidateRegistrationService();

export const registerCandidate = onRequest(async (request, response) => {
  if (!assertPostMethod(request, response)) {
    return;
  }

  try {
    const authContext = await getAuthContext(request);
    const candidateId = resolveCandidateId(authContext);
    const payload = getPayload<CandidatePostulationPayload>(request.body);
    validateRegisterCandidatePayload(payload);

    const result = await candidateRegistrationService.registerCandidate(
      candidateId,
      payload,
    );

    response.status(200).json(result);
  } catch (error) {
    if (error instanceof CandidateRegistrationConflictError) {
      sendError(
        response,
        new HttpsError('already-exists', error.message),
        'No se pudo registrar el candidato.',
      );
      return;
    }

    logger.error('Error inesperado registrando candidato', error);
    sendError(response, error, 'No se pudo registrar el candidato.');
  }
});

export const confirmCandidateProfile = onRequest(async (request, response) => {
  if (!assertPostMethod(request, response)) {
    return;
  }

  try {
    const authContext = await getAuthContext(request);
    const payload = getPayload<ConfirmCandidateProfilePayload>(request.body);
    logger.info('Iniciando confirmación de perfil de candidato', {
      uid: authContext.uid,
      candidateId: payload.candidateId,
      applicationId: payload.applicationId,
    });

    if (!payload.candidateId || !payload.profile) {
      throw new HttpsError(
        'invalid-argument',
        'Faltan argumentos mandatorios: candidateId y profile son requeridos.',
      );
    }

    const result = await candidateRegistrationService.confirmCandidateProfile(
      payload as ConfirmCandidateProfilePayload,
    );

    logger.info('Perfil de candidato confirmado con éxito', {
      candidateId: result.candidateId,
      applicationId: result.applicationId,
    });

    response.status(200).json(result);
  } catch (error: any) {
    logger.error('Error fatal al confirmar el perfil del candidato', {
      error: error.message,
      payload: request.body,
    });

    if (error.message?.includes('CANDIDATE_NOT_FOUND')) {
      sendError(
        response,
        new HttpsError('not-found', error.message),
        'Ocurrió un error interno en el servidor al procesar la confirmación.',
      );
      return;
    }

    sendError(
      response,
      error,
      'Ocurrió un error interno en el servidor al procesar la confirmación.',
    );
  }
});
