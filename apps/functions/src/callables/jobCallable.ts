import { logger } from 'firebase-functions';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';

import type {
  CreateJobPayload,
  GetInternalJobDetailPayload,
  UpdatePositionPayload,
  UpdatePositionStatusPayload,
} from '@ats/shared-types';

import { HttpAuthError, requireAuthenticatedUser } from '../core/http-auth';
import {
  CreateJobServiceError,
  GetInternalJobDetailServiceError,
  GetJobDetailServiceError,
  InternalJobDetailNotFoundError,
  InternalJobDetailValidationError,
  JobDetailNotFoundError,
  JobDetailValidationError,
  JobService,
  JobUpdateNotFoundError,
  ListOpenJobsServiceError,
  UpdateJobServiceError,
} from '../services/jobService';
import {
  validateCreateJobPayload,
  validateGetInternalJobDetailPayload,
  validateUpdatePositionPayload,
  validateUpdatePositionStatusPayload,
} from '../validators/jobValidator';

const jobService = new JobService();

export const createJob = onRequest(async (request, response) => {
  try {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const recruiterId = await requireAuthenticatedUser(request);
    const payload = request.body as Partial<CreateJobPayload>;

    validateCreateJobPayload(payload);

    const result = await jobService.createJob(recruiterId, payload);

    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof HttpsError) {
      response.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof CreateJobServiceError) {
      logger.error('Error de negocio creando posición', error);
      response.status(500).json({ error: error.message });
      return;
    }

    logger.error('Error inesperado creando posición', error);
    response.status(500).json({ error: 'No se pudo crear la posición.' });
  }
});

export const listOpenJobs = onRequest(async (request, response) => {
  if (request.method !== 'GET') {
    response
      .status(405)
      .json({ error: 'Method not allowed. Use GET to list open jobs.' });
    return;
  }

  try {
    const jobs = await jobService.listOpenJobs();
    response.status(200).json(jobs);
  } catch (error) {
    logger.error('Error listando puestos abiertos', error);

    if (error instanceof ListOpenJobsServiceError) {
      response.status(500).json({ error: error.message });
      return;
    }

    response
      .status(500)
      .json({ error: 'No se pudieron obtener los puestos abiertos.' });
  }
});

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
    const job = await jobService.getJobDetail(jobId);
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

export const getInternalJobDetail = onCall(async (request) => {
  try {
    const payload = request.data as Partial<GetInternalJobDetailPayload>;

    validateGetInternalJobDetailPayload(payload);

    return await jobService.getInternalJobDetail(payload.jobId);
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    if (error instanceof InternalJobDetailValidationError) {
      throw new HttpsError('invalid-argument', error.message);
    }

    if (error instanceof InternalJobDetailNotFoundError) {
      throw new HttpsError('not-found', error.message);
    }

    logger.error(
      'Error inesperado obteniendo detalle interno de posición',
      error,
    );

    if (error instanceof GetInternalJobDetailServiceError) {
      throw new HttpsError('internal', error.message);
    }

    throw new HttpsError(
      'internal',
      'No se pudo obtener el detalle interno del puesto.',
    );
  }
});

export const getPosition = onRequest(async (request, response) => {
  try {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    await requireAuthenticatedUser(request);

    const id =
      typeof request.query.id === 'string' ? request.query.id.trim() : '';

    if (!id) {
      response.status(400).json({ error: 'El parámetro id es requerido.' });
      return;
    }

    const job = await jobService.getInternalJobDetail(id);

    response.status(200).json(job);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof InternalJobDetailNotFoundError) {
      response.status(404).json({ error: 'Posición no encontrada.' });
      return;
    }

    if (error instanceof GetInternalJobDetailServiceError) {
      logger.error('Error de negocio obteniendo posición', error);
      response.status(500).json({ error: error.message });
      return;
    }

    logger.error('Error inesperado obteniendo posición', error);
    response.status(500).json({ error: 'No se pudo obtener la posición.' });
  }
});

export const updatePosition = onRequest(async (request, response) => {
  try {
    if (request.method !== 'PATCH') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    await requireAuthenticatedUser(request);

    const payload = request.body as Partial<UpdatePositionPayload>;

    validateUpdatePositionPayload(payload);

    const result = await jobService.updatePosition(payload);

    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof HttpsError) {
      response.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof JobUpdateNotFoundError) {
      response.status(404).json({ error: 'Posición no encontrada.' });
      return;
    }

    if (error instanceof UpdateJobServiceError) {
      logger.error('Error de negocio actualizando posición', error);
      response.status(500).json({ error: error.message });
      return;
    }

    logger.error('Error inesperado actualizando posición', error);
    response.status(500).json({ error: 'No se pudo actualizar la posición.' });
  }
});

export const updatePositionStatus = onRequest(async (request, response) => {
  try {
    if (request.method !== 'PATCH') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    await requireAuthenticatedUser(request);

    const payload = request.body as Partial<UpdatePositionStatusPayload>;

    validateUpdatePositionStatusPayload(payload);

    const result = await jobService.updatePositionStatus(
      payload.id,
      payload.status,
    );

    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof HttpsError) {
      response.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof JobUpdateNotFoundError) {
      response.status(404).json({ error: 'Posición no encontrada.' });
      return;
    }

    if (error instanceof UpdateJobServiceError) {
      logger.error('Error de negocio actualizando estado de posición', error);
      response.status(500).json({ error: error.message });
      return;
    }

    logger.error('Error inesperado actualizando estado de posición', error);
    response
      .status(500)
      .json({ error: 'No se pudo actualizar el estado de la posición.' });
  }
});
