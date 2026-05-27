import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import type { UpdateApplicationStagePayload } from '@ats/shared-types';

import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import { ApplicationsRepository } from '../repositories/applicationRepository';
import {
  ApplicationNotFoundError,
  UpdateApplicationStageService,
} from '../services/updateApplicationService';
import { validateUpdateApplicationStagePayload } from '../validators/updateApplicationValidator';

interface UpdateApplicationPayload {
  applicationId: string;
  fortalezas: string[];
}

const applicationsRepository = new ApplicationsRepository();
const updateApplicationStageService = new UpdateApplicationStageService();

export const updateApplication = onRequest(async (request, response) => {
  try {
    if (request.method !== 'PATCH') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    await requireAuthenticatedUser(request);

    const payload = request.body as Partial<UpdateApplicationPayload>;

    if (!payload.applicationId || payload.applicationId.trim().length === 0) {
      response
        .status(400)
        .json({ error: 'El campo applicationId es obligatorio.' });
      return;
    }

    if (!Array.isArray(payload.fortalezas)) {
      response
        .status(400)
        .json({ error: 'El campo fortalezas debe ser un array de strings.' });
      return;
    }

    const fortalezas = payload.fortalezas
      .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
      .map((f) => f.trim());

    await applicationsRepository.update(payload.applicationId.trim(), {
      fortalezas,
    });

    logger.info('[updateApplication] Fortalezas actualizadas', {
      applicationId: payload.applicationId,
      total: fortalezas.length,
    });

    response.status(200).json({ success: true, fortalezas });
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    logger.error('[updateApplication] Error actualizando postulación', error);
    response
      .status(500)
      .json({ error: 'No se pudo actualizar la postulación.' });
  }
});

export const updateApplicationStage = onRequest(async (request, response) => {
  try {
    if (request.method !== 'PATCH') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const { uid } = await requireAuthenticatedUser(request);

    const payload = request.body as Partial<UpdateApplicationStagePayload>;
    validateUpdateApplicationStagePayload(payload);

    const result = await updateApplicationStageService.updateStage(
      payload,
      uid,
    );

    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof ApplicationNotFoundError) {
      response.status(404).json({ error: error.message });
      return;
    }

    logger.error('Error inesperado actualizando etapa de postulación', error);
    response
      .status(500)
      .json({ error: 'No se pudo actualizar la postulación.' });
  }
});
