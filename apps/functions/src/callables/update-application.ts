import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

import type { UpdateApplicationStagePayload } from '@ats/shared-types';

import { validateUpdateApplicationStagePayload } from '../validators/update-application-validator';
import {
  UpdateApplicationStageService,
  ApplicationNotFoundError,
} from '../services/update-application-service';

const updateApplicationStageService = new UpdateApplicationStageService();

export const updateApplicationStage = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado para actualizar una postulación.',
    );
  }

  try {
    const payload = request.data as Partial<UpdateApplicationStagePayload>;

    validateUpdateApplicationStagePayload(payload);

    return await updateApplicationStageService.updateStage(payload);
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    if (error instanceof ApplicationNotFoundError) {
      throw new HttpsError('not-found', error.message);
    }

    logger.error('Error inesperado actualizando etapa de postulación', error);

    throw new HttpsError(
      'internal',
      'No se pudo actualizar la postulación.',
    );
  }
});
