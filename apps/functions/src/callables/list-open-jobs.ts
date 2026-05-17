import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import { ListOpenJobsService } from '../services/list-open-jobs-service';

const listOpenJobsService = new ListOpenJobsService();

export const listOpenJobs = onRequest(async (request, response) => {
  if (request.method !== 'GET') {
    response
      .status(405)
      .json({ error: 'Method not allowed. Use GET to list open jobs.' });
    return;
  }

  try {
    const jobs = await listOpenJobsService.listOpenJobs();
    response.status(200).json(jobs);
  } catch (error) {
    logger.error('Error listando puestos abiertos', error);
    response
      .status(500)
      .json({ error: 'No se pudieron obtener los puestos abiertos.' });
  }
});
