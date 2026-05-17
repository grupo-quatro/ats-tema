import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import {
  GetJobDetailService,
  GetJobDetailServiceError,
  JobDetailNotFoundError,
  JobDetailValidationError,
} from '../services/get-job-detail-service';

const getJobDetailService = new GetJobDetailService();

export const getJobDetail = onRequest(async (request, response) => {
  if (request.method !== 'GET') {
    response
      .status(405)
      .json({ error: 'Method not allowed. Use GET to get a job detail.' });
    return;
  }

  const jobId = request.query.jobId;

  if (typeof jobId !== 'string') {
    response.status(400).json({ error: 'The jobId query param is required.' });
    return;
  }

  try {
    const job = await getJobDetailService.getJobDetail(jobId);
    response.status(200).json(job);
  } catch (error) {
    if (error instanceof JobDetailValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof JobDetailNotFoundError) {
      response.status(404).json({ error: error.message });
      return;
    }

    logger.error('Error obteniendo detalle de puesto', error);

    if (error instanceof GetJobDetailServiceError) {
      response.status(500).json({ error: error.message });
      return;
    }

    response
      .status(500)
      .json({ error: 'No se pudo obtener el detalle del puesto.' });
  }
});
