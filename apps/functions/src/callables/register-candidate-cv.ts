/**
 * - validar auth;
- resolver candidateId desde request.auth;
- validar payload;
- llamar al service;
- traducir errores a HttpsError.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { RegisterCandidateCVPayload } from '@ats/shared-types';

import { validateStartApplicationWithCVPayload } from '../validators/register-candidate-cv-validator';
import { CandidateRegistrationCVService } from '../services/register-candidate-cv-service';

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
    const payload = request.data as Partial<RegisterCandidateCVPayload>;

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
