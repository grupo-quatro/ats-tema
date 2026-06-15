import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { OAuth2Client } from 'google-auth-library';

import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import { setCorsHeaders } from '../core/cors';
import { oauthEncryptionKey } from '../core/secrets';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { UserRepository } from '../repositories/userRepository';
import { ExchangeCalendarCodeService } from '../services/exchangeCalendarCodeService';
import {
  validateExchangeCalendarCodePayload,
  ExchangeCalendarCodeValidationError,
} from '../validators/exchangeCalendarCodeValidator';

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
);

const userRepository = new UserRepository();
const exchangeCalendarCodeService = new ExchangeCalendarCodeService(
  userRepository,
  oauth2Client,
  new EmployeeRepository(),
);

export const exchangeCalendarCode = onRequest(
  { secrets: [oauthEncryptionKey] },
  async (request, response) => {
    setCorsHeaders(response);

    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    try {
      if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method Not Allowed.' });
        return;
      }

      const { uid } = await requireAuthenticatedUser(request);

      validateExchangeCalendarCodePayload(request.body);

      const { code, redirectUri } = request.body;

      await exchangeCalendarCodeService.exchange(uid, code, redirectUri);

      logger.info('[exchangeCalendarCode] Credencial de Calendar guardada', {
        uid,
      });

      response.status(200).json({ ok: true });
    } catch (error) {
      if (error instanceof HttpAuthError) {
        response.status(401).json({ error: error.message });
        return;
      }

      if (error instanceof ExchangeCalendarCodeValidationError) {
        response.status(400).json({ error: error.message });
        return;
      }

      logger.error(
        '[exchangeCalendarCode] Error intercambiando código de Calendar',
        error,
      );
      response
        .status(500)
        .json({ error: 'No se pudo conectar la cuenta de Google Calendar.' });
    }
  },
);
