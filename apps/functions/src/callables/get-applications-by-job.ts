import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

import type { GetApplicationsByJobPayload } from '@ats/shared-types';

import { validateGetApplicationsByJobPayload } from '../validators/get-applications-by-job-validator';
import {
  GetApplicationsByJobService,
  JobNotFoundError,
} from '../services/get-applications-by-job-service';
import { HttpAuthError, requireAuthenticatedUser } from '../core/http-auth';

const getApplicationsByJobService = new GetApplicationsByJobService();

export const getApplicationsByJob = onRequest(async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    await requireAuthenticatedUser(req);

    const { jobId, orderBy, orderDirection, limit } = req.query;
    const payload: Partial<GetApplicationsByJobPayload> = {
      jobId: jobId as string,
      orderBy: orderBy as GetApplicationsByJobPayload['orderBy'],
      orderDirection:
        orderDirection as GetApplicationsByJobPayload['orderDirection'],
      limit: limit ? Number(limit) : undefined,
    };

    validateGetApplicationsByJobPayload(payload);

    const { jobId: validJobId, ...options } = payload;
    const result = await getApplicationsByJobService.getApplicationsByJob(
      validJobId,
      options,
    );

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      res.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof JobNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }

    logger.error(
      'Error inesperado obteniendo postulaciones por posición',
      error,
    );
    res
      .status(500)
      .json({ error: 'No se pudieron obtener las postulaciones.' });
  }
});
