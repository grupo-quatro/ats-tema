import { logger } from 'firebase-functions';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';

import type { UpdateApplicationStagePayload } from '@ats/shared-types';

import { HttpAuthError, requireAuthenticatedUser } from '../core/http-auth';
import { ApplicationsRepository } from '../repositories/application-repository';
import {
  UpdateApplicationStageService,
  ApplicationNotFoundError,
} from '../services/update-application-service';
import { validateUpdateApplicationStagePayload } from '../validators/update-application-validator';

interface UpdateApplicationPayload {
  applicationId: string;
  fortalezas: string[];
}

const updateApplicationStageService = new UpdateApplicationStageService();
const applicationsRepository = new ApplicationsRepository();

export const updateApplicationStage = onRequest(async (request, response) => {
  try {
    if (request.method !== 'PATCH') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const uid = await requireAuthenticatedUser(request);

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

export const updateApplication = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado para actualizar una postulación.',
    );
  }

  const payload = request.data as Partial<UpdateApplicationPayload>;

  if (!payload.applicationId || payload.applicationId.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'El identificador de la postulación (applicationId) es obligatorio.',
    );
  }

  if (!Array.isArray(payload.fortalezas)) {
    throw new HttpsError(
      'invalid-argument',
      'El campo fortalezas debe ser un array de strings.',
    );
  }

  const fortalezas = payload.fortalezas
    .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
    .map((f) => f.trim());

  try {
    await applicationsRepository.update(payload.applicationId.trim(), {
      fortalezas,
    });

    logger.info('[updateApplication] Fortalezas actualizadas', {
      applicationId: payload.applicationId,
      total: fortalezas.length,
    });

    return { success: true, fortalezas };
  } catch (error) {
    logger.error('[updateApplication] Error actualizando postulación', error);

    throw new HttpsError('internal', 'No se pudo actualizar la postulación.');
  }
});
