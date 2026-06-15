import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import { setCorsHeaders } from '../core/cors';
import {
  GetEmailLogsValidationError,
  validateGetEmailLogsPayload,
} from '../validators/getEmailLogsValidator';
import { GetEmailLogsService } from '../services/getEmailLogsService';

const getEmailLogsService = new GetEmailLogsService();

export const getEmailLogs = onRequest(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  try {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    await requireAuthenticatedUser(request);

    const query = request.query as Partial<{
      candidateId: string;
      applicationId: string;
    }>;
    validateGetEmailLogsPayload(query);

    const logs = query.applicationId
      ? await getEmailLogsService.getFailedByApplication(query.applicationId)
      : await getEmailLogsService.getByCandidate(query.candidateId!);

    response.status(200).json({ logs });
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof GetEmailLogsValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }

    logger.error(
      '[getEmailLogs] Error inesperado obteniendo historial de emails',
      error,
    );
    response
      .status(500)
      .json({ error: 'No se pudo obtener el historial de comunicaciones.' });
  }
});
