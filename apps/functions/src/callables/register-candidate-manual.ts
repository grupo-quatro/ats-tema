import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import type { RegisterCandidatePayload } from '@ats/shared-types';

import {
  CandidateRegistrationConflictError,
  CandidateRegistrationService,
} from '../services/register-candidate-manual-service';
import { validateRegisterCandidatePayload } from '../validators/register-candidate-manual-validator';

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
    const payload = request.data as Partial<RegisterCandidatePayload>;

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
