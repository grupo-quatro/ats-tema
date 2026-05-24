import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

import type { UpdateApplicationStagePayload } from '@ats/shared-types';

import { validateUpdateApplicationStagePayload } from '../validators/update-application-validator';
import {
  UpdateApplicationStageService,
  ApplicationNotFoundError,
} from '../services/update-application-service';
import { HttpAuthError, requireAuthenticatedUser } from '../core/http-auth';

const updateApplicationStageService = new UpdateApplicationStageService();

export const updateApplicationStage = onRequest(async (req, res) => {
  try {
    if (req.method !== 'PATCH') {
      res.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    await requireAuthenticatedUser(req);

    const payload = req.body as Partial<UpdateApplicationStagePayload>;
    validateUpdateApplicationStagePayload(payload);

    const result = await updateApplicationStageService.updateStage(payload);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      res.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof ApplicationNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }

    logger.error('Error inesperado actualizando etapa de postulación', error);
    res.status(500).json({ error: 'No se pudo actualizar la postulación.' });
  }
});
