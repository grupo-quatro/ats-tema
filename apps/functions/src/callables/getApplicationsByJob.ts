import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import type { GetApplicationsByJobPayload } from '@ats/shared-types';

import {
  validateGetApplicationsByJobPayload,
  GetApplicationsByJobValidationError,
} from '../validators/getApplicationsByJobValidator';
import {
  GetApplicationsByJobService,
  GetApplicationsByJobServiceError,
  JobNotFoundError,
} from '../services/getApplicationsByJobService';
import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';

const getApplicationsByJobService = new GetApplicationsByJobService();

export const getApplicationsByJob = onRequest(async (request, response) => {
  try {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    await requireAuthenticatedUser(request);

    const { jobId, orderBy, orderDirection, limit } = request.query;

    const payload: Partial<GetApplicationsByJobPayload> = {
      jobId: typeof jobId === 'string' ? jobId.trim() : undefined,
      orderBy:
        typeof orderBy === 'string'
          ? (orderBy as GetApplicationsByJobPayload['orderBy'])
          : undefined,
      orderDirection:
        typeof orderDirection === 'string'
          ? (orderDirection as GetApplicationsByJobPayload['orderDirection'])
          : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    };

    validateGetApplicationsByJobPayload(payload);

    const { jobId: validJobId, ...options } = payload;
    const result = await getApplicationsByJobService.getApplicationsByJob(
      validJobId,
      options,
    );

    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof GetApplicationsByJobValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof JobNotFoundError) {
      response.status(404).json({ error: error.message });
      return;
    }

    if (error instanceof GetApplicationsByJobServiceError) {
      logger.error('Error de negocio obteniendo postulaciones', error);
      response.status(500).json({ error: error.message });
      return;
    }

    logger.error('Error inesperado obteniendo postulaciones', error);
    response
      .status(500)
      .json({ error: 'No se pudieron obtener las postulaciones.' });
  }
});
