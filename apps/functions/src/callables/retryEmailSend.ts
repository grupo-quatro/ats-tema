import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { OAuth2Client } from 'google-auth-library';

import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import {
  RetryEmailSendValidationError,
  validateRetryEmailSendPayload,
} from '../validators/retryEmailSendValidator';
import { EmailLogRepository } from '../repositories/emailLogRepository';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { UserRepository } from '../repositories/userRepository';
import { GmailSenderService } from '../services/gmailSenderService';
import {
  EmailLogNotFoundError,
  OfferEmailRetryUnsupportedError,
  RetryEmailSendService,
} from '../services/retryEmailSendService';

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
);

const retryEmailSendService = new RetryEmailSendService(
  new EmailLogRepository(),
  new UserRepository(),
  new GmailSenderService(),
  oauth2Client,
  new EmployeeRepository(),
);

export const retryEmailSend = onRequest(
  { secrets: ['OAUTH_ENCRYPTION_KEY'] },
  async (request, response) => {
    try {
      if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method Not Allowed.' });
        return;
      }

      const { uid } = await requireAuthenticatedUser(request);

      const body = request.body as Partial<{ logId: string }>;
      validateRetryEmailSendPayload(body);

      await retryEmailSendService.retry(body.logId, uid);

      response.status(200).json({ ok: true });
    } catch (error) {
      if (error instanceof HttpAuthError) {
        response.status(401).json({ error: error.message });
        return;
      }

      if (error instanceof RetryEmailSendValidationError) {
        response.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof EmailLogNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }

      if (error instanceof OfferEmailRetryUnsupportedError) {
        response.status(409).json({ error: error.message });
        return;
      }

      logger.error(
        '[retryEmailSend] Error inesperado al reintentar envío de email',
        error,
      );
      response.status(500).json({ error: 'No se pudo reenviar el email.' });
    }
  },
);
