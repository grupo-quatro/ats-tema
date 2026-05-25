// branch: fb-50-57
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { ApplicationsRepository } from '../repositories/application-repository';

interface UpdateApplicationPayload {
  applicationId: string;
  fortalezas: string[];
}

const applicationsRepository = new ApplicationsRepository();

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
