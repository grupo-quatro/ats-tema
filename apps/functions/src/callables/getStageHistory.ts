import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import { validateGetStageHistoryPayload } from '../validators/getStageHistoryValidator';
import { GetStageHistoryService } from '../services/getStageHistoryService';
import { ApplicationNotFoundError } from '../services/updateApplicationService';

const getStageHistoryService = new GetStageHistoryService();

export const getStageHistory = onRequest(async (request, response) => {
  try {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    await requireAuthenticatedUser(request);

    const query = request.query as Partial<{ applicationId: string }>;
    validateGetStageHistoryPayload(query);

    const result = await getStageHistoryService.getHistory(query.applicationId);

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

    logger.error('Error inesperado obteniendo historial de etapa', error);
    response.status(500).json({ error: 'No se pudo obtener el historial.' });
  }
});
