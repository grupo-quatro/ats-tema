import { HttpsError, onRequest } from 'firebase-functions/v2/https';
import { setCorsHeaders } from '../core/cors';
import { logger } from 'firebase-functions';
import {
  CandidatePostulationCVPayload,
  CandidatePostulationPayload,
  ConfirmCandidateProfilePayload,
  DiscardCandidateDraftPayload,
  GetCandidateProfileForConfirmationPayload,
} from '@ats/shared-types';

import { CandidateRegistrationCVService } from '../services/candidateService';
import {
  CandidateProfileForConfirmationApplicationMismatchError,
  CandidateProfileForConfirmationApplicationNotFoundError,
  CandidateProfileForConfirmationNotFoundError,
  CandidateDraftDiscardNotAllowedError,
  CandidateRegistrationConflictError,
  CandidateRegistrationService,
} from '../services/candidateService';
import {
  validateConfirmCandidateProfilePayload,
  validateDiscardCandidateDraftPayload,
  validateGetCandidateProfileForConfirmationPayload,
  validateRegisterCandidatePayload,
  validateStartApplicationWithCVPayload,
} from '../validators/candidateValidator';
import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';

function sendError(
  response: Parameters<Parameters<typeof onRequest>[0]>[1],
  error: unknown,
  fallbackMessage: string,
): void {
  if (error instanceof HttpAuthError) {
    response
      .status(401)
      .json({ error: error.message, code: 'unauthenticated' });
    return;
  }

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

function assertMethod(
  request: Parameters<Parameters<typeof onRequest>[0]>[0],
  response: Parameters<Parameters<typeof onRequest>[0]>[1],
  expectedMethod: 'GET' | 'PATCH' | 'POST',
): boolean {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return false;
  }

  if (request.method !== expectedMethod) {
    response.status(405).json({
      error: `Method not allowed. Use ${expectedMethod}.`,
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido';
}

const candidateRegistrationCVService = new CandidateRegistrationCVService();
export const registerCandidateCV = onRequest(async (request, response) => {
  if (!assertMethod(request, response, 'POST')) {
    return;
  }

  try {
    const { uid: authenticatedUid } = await requireAuthenticatedUser(request);
    const payload = getPayload<CandidatePostulationCVPayload>(request.body);
    validateStartApplicationWithCVPayload(payload);

    const result = await candidateRegistrationCVService.registerCandidateCV(
      authenticatedUid,
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
  if (!assertMethod(request, response, 'POST')) {
    return;
  }

  try {
    const { uid: authenticatedUid } = await requireAuthenticatedUser(request);
    const payload = getPayload<CandidatePostulationPayload>(request.body);
    validateRegisterCandidatePayload(payload);

    const result = await candidateRegistrationService.registerCandidate(
      authenticatedUid,
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

export const getCandidateProfileForConfirmation = onRequest(
  async (request, response) => {
    if (!assertMethod(request, response, 'GET')) {
      return;
    }

    try {
      await requireAuthenticatedUser(request);
      const { candidateId, applicationId } = request.query;
      const payload: Partial<GetCandidateProfileForConfirmationPayload> = {
        candidateId:
          typeof candidateId === 'string' ? candidateId.trim() : undefined,
        applicationId:
          typeof applicationId === 'string' ? applicationId.trim() : undefined,
      };
      validateGetCandidateProfileForConfirmationPayload(payload);

      const result =
        await candidateRegistrationService.getCandidateProfileForConfirmation(
          payload,
        );

      response.status(200).json(result);
    } catch (error) {
      if (
        error instanceof CandidateProfileForConfirmationNotFoundError ||
        error instanceof CandidateProfileForConfirmationApplicationNotFoundError
      ) {
        sendError(
          response,
          new HttpsError('not-found', error.message),
          'No se pudo obtener el perfil del candidato.',
        );
        return;
      }

      if (
        error instanceof CandidateProfileForConfirmationApplicationMismatchError
      ) {
        sendError(
          response,
          new HttpsError('permission-denied', error.message),
          'No se pudo obtener el perfil del candidato.',
        );
        return;
      }

      logger.error(
        'Error inesperado obteniendo perfil de candidato para confirmación',
        error,
      );
      sendError(response, error, 'No se pudo obtener el perfil del candidato.');
    }
  },
);

export const confirmCandidateProfile = onRequest(async (request, response) => {
  if (!assertMethod(request, response, 'PATCH')) {
    return;
  }

  try {
    const { uid: authenticatedUid } = await requireAuthenticatedUser(request);
    const payload = getPayload<ConfirmCandidateProfilePayload>(request.body);
    logger.info('Iniciando confirmación de perfil de candidato', {
      uid: authenticatedUid,
      candidateId: payload.candidateId,
      applicationId: payload.applicationId,
    });

    validateConfirmCandidateProfilePayload(payload);

    const result = await candidateRegistrationService.confirmCandidateProfile(
      payload,
    );

    logger.info('Perfil de candidato confirmado con éxito', {
      candidateId: result.candidateId,
      applicationId: result.applicationId,
    });

    response.status(200).json(result);
  } catch (error) {
    logger.error('Error fatal al confirmar el perfil del candidato', {
      error: getErrorMessage(error),
      payload: request.body,
    });

    if (error instanceof CandidateRegistrationConflictError) {
      sendError(
        response,
        new HttpsError('already-exists', error.message),
        'Ocurrió un error interno en el servidor al procesar la confirmación.',
      );
      return;
    }

    if (getErrorMessage(error).includes('CANDIDATE_NOT_FOUND')) {
      sendError(
        response,
        new HttpsError('not-found', getErrorMessage(error)),
        'Ocurrió un error interno en el servidor al procesar la confirmación.',
      );
      return;
    }

    if (
      error instanceof CandidateProfileForConfirmationApplicationNotFoundError
    ) {
      sendError(
        response,
        new HttpsError('not-found', error.message),
        'Ocurrió un error interno en el servidor al procesar la confirmación.',
      );
      return;
    }

    if (
      error instanceof CandidateProfileForConfirmationApplicationMismatchError
    ) {
      sendError(
        response,
        new HttpsError('permission-denied', error.message),
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

export const discardCandidateDraft = onRequest(async (request, response) => {
  if (!assertMethod(request, response, 'POST')) {
    return;
  }

  try {
    await requireAuthenticatedUser(request);
    const payload = getPayload<DiscardCandidateDraftPayload>(request.body);
    validateDiscardCandidateDraftPayload(payload);

    const result =
      await candidateRegistrationService.discardCandidateDraft(payload);

    response.status(200).json(result);
  } catch (error) {
    if (
      error instanceof CandidateProfileForConfirmationNotFoundError ||
      error instanceof CandidateProfileForConfirmationApplicationNotFoundError
    ) {
      sendError(
        response,
        new HttpsError('not-found', error.message),
        'No se pudo descartar la postulación.',
      );
      return;
    }

    if (
      error instanceof CandidateProfileForConfirmationApplicationMismatchError
    ) {
      sendError(
        response,
        new HttpsError('permission-denied', error.message),
        'No se pudo descartar la postulación.',
      );
      return;
    }

    if (error instanceof CandidateDraftDiscardNotAllowedError) {
      sendError(
        response,
        new HttpsError('failed-precondition', error.message),
        'No se pudo descartar la postulación.',
      );
      return;
    }

    logger.error('Error inesperado descartando postulación por CV', error);
    sendError(response, error, 'No se pudo descartar la postulación.');
  }
});
