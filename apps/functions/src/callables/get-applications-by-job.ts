import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

import type { GetApplicationsByJobPayload } from '@ats/shared-types';

import { validateGetApplicationsByJobPayload } from '../validators/get-applications-by-job-validator';
import {
  GetApplicationsByJobService,
  JobNotFoundError,
} from '../services/get-applications-by-job-service';

const getApplicationsByJobService = new GetApplicationsByJobService();

export const getApplicationsByJob = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado para consultar las postulaciones.',
    );
  }

  try {
    const payload = request.data as Partial<GetApplicationsByJobPayload>;

    validateGetApplicationsByJobPayload(payload);

    const { jobId, ...options } = payload;

    return await getApplicationsByJobService.getApplicationsByJob(
      jobId,
      options,
    );
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    if (error instanceof JobNotFoundError) {
      throw new HttpsError('not-found', error.message);
    }

    logger.error(
      'Error inesperado obteniendo postulaciones por posición',
      error,
    );

    throw new HttpsError(
      'internal',
      'No se pudieron obtener las postulaciones.',
    );
  }
});
