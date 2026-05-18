import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import type { SubmitApplicationPayload } from '@ats/shared-types';

import {
  ApplicationAlreadyExistsError,
  CandidateNotFoundError,
  JobNotFoundError,
  JobNotOpenError,
} from '../services/submit-application-errors';
import { SubmitApplicationService } from '../services/submit-application-service';
import { validateSubmitApplicationPayload } from '../validators/submit-application-validator';

const submitApplicationService = new SubmitApplicationService();

export const submitApplication = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado para postularse.',
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
    const payload = request.data as Partial<SubmitApplicationPayload>;

    validateSubmitApplicationPayload(payload);

    return await submitApplicationService.submitApplication(
      candidateId,
      payload.jobId,
    );
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    if (error instanceof CandidateNotFoundError) {
      throw new HttpsError('not-found', error.message);
    }

    if (error instanceof JobNotFoundError) {
      throw new HttpsError('not-found', error.message);
    }

    if (error instanceof JobNotOpenError) {
      throw new HttpsError('failed-precondition', error.message);
    }

    if (error instanceof ApplicationAlreadyExistsError) {
      throw new HttpsError('already-exists', error.message);
    }

    logger.error('Error inesperado al registrar postulación', error);

    throw new HttpsError('internal', 'No se pudo registrar la postulación.');
  }
});
