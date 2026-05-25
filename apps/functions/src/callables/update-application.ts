import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import type { UpdateApplicationStagePayload } from '@ats/shared-types';

import { HttpAuthError, requireAuthenticatedUser } from '../core/http-auth';
import { validateUpdateApplicationStagePayload } from '../validators/update-application-validator';
import {
  UpdateApplicationStageService,
  ApplicationNotFoundError,
} from '../services/update-application-service';

const updateApplicationStageService = new UpdateApplicationStageService();

export const updateApplicationStage = onRequest(async (request, response) => {
  try {
    if (request.method !== 'PATCH') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    await requireAuthenticatedUser(request);

    const payload = request.body as Partial<UpdateApplicationStagePayload>;
    validateUpdateApplicationStagePayload(payload);

    const result = await updateApplicationStageService.updateStage(payload);

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
