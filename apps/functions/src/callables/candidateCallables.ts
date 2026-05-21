import { onCall, HttpsError } from 'firebase-functions/v2/https';
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

const candidateRegistrationCVService = new CandidateRegistrationCVService();
export const registerCandidateCV = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado para iniciar una postulación por CV.',
    );
  }

  const candidateId =
    request.auth.uid ||
    request.auth.token?.uid ||
    request.auth.token?.user_id ||
    request.auth.token?.sub;

  if (!candidateId) {
    logger.error('No se pudo resolver candidateId desde request.auth', {
      auth: request.auth,
    });

    throw new HttpsError(
      'unauthenticated',
      'No se pudo identificar al usuario autenticado.',
    );
  }

  try {
    const payload = request.data as Partial<CandidatePostulationCVPayload>;

    validateStartApplicationWithCVPayload(payload);

    return await candidateRegistrationCVService.registerCandidateCV(
      candidateId,
      payload,
    );
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    logger.error('Error inesperado iniciando postulación por CV', error);

    throw new HttpsError(
      'internal',
      'No se pudo iniciar la postulación por CV.',
    );
  }
});

const candidateRegistrationService = new CandidateRegistrationService();

export const registerCandidate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado para registrar un candidato.',
    );
  }

  const candidateId =
    request.auth.uid ||
    request.auth.token?.uid ||
    request.auth.token?.user_id ||
    request.auth.token?.sub;

  if (!candidateId) {
    logger.error('No se pudo resolver candidateId desde request.auth', {
      auth: request.auth,
    });

    throw new HttpsError(
      'unauthenticated',
      'No se pudo identificar al usuario autenticado.',
    );
  }

  try {
    const payload = request.data as Partial<CandidatePostulationPayload>;

    validateRegisterCandidatePayload(payload);

    return await candidateRegistrationService.registerCandidate(
      candidateId,
      payload,
    );
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    if (error instanceof CandidateRegistrationConflictError) {
      throw new HttpsError('already-exists', error.message);
    }

    logger.error('Error inesperado registrando candidato', error);

    throw new HttpsError('internal', 'No se pudo registrar el candidato.');
  }
});

export const confirmCandidateProfile = onCall<ConfirmCandidateProfilePayload>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'El usuario debe estar autenticado para confirmar su postulación.',
      );
    }

    logger.info('Iniciando confirmación de perfil de candidato', {
      uid: request.auth.uid,
      candidateId: request.data.candidateId,
      applicationId: request.data.applicationId,
    });

    if (!request.data.candidateId || !request.data.profile) {
      throw new HttpsError(
        'invalid-argument',
        'Faltan argumentos mandatorios: candidateId y profile son requeridos.',
      );
    }

    try {
      const result = await candidateRegistrationService.confirmCandidateProfile(
        request.data,
      );

      logger.info('Perfil de candidato confirmado con éxito', {
        candidateId: result.candidateId,
        applicationId: result.applicationId,
      });

      return result;
    } catch (error: any) {
      logger.error('Error fatal al confirmar el perfil del candidato', {
        error: error.message,
        payload: request.data,
      });

      if (error.message.includes('CANDIDATE_NOT_FOUND')) {
        throw new HttpsError('not-found', error.message);
      }

      throw new HttpsError(
        'internal',
        'Ocurrió un error interno en el servidor al procesar la confirmación.',
      );
    }
  },
);
