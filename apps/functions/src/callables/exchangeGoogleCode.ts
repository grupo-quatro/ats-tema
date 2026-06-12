import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { OAuth2Client } from 'google-auth-library';

import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import { setCorsHeaders } from '../core/cors';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { UserRepository } from '../repositories/userRepository';
import {
  ExchangeGoogleCodeError,
  ExchangeGoogleCodeService,
} from '../services/exchangeGoogleCodeService';

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
);

const exchangeGoogleCodeService = new ExchangeGoogleCodeService(
  new UserRepository(),
  oauth2Client,
  new EmployeeRepository(),
);

export const exchangeGoogleCode = onRequest(
  { secrets: ['OAUTH_ENCRYPTION_KEY'] },
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
      const { code, redirectUri } = request.body as {
        code?: string;
        redirectUri?: string;
      };

      if (!code || !redirectUri) {
        response
          .status(400)
          .json({ error: 'code y redirectUri son requeridos.' });
        return;
      }

      await exchangeGoogleCodeService.exchange(uid, code, redirectUri);

      logger.info(
        '[exchangeGoogleCode] Credenciales de Gmail y Calendar guardadas',
        { uid },
      );

      response.status(200).json({ ok: true });
    } catch (error) {
      if (error instanceof HttpAuthError) {
        response.status(401).json({ error: error.message });
        return;
      }
      if (error instanceof ExchangeGoogleCodeError) {
        response.status(400).json({ error: error.message });
        return;
      }
      logger.error(
        '[exchangeGoogleCode] Error intercambiando código de Google',
        error,
      );
      response
        .status(500)
        .json({ error: 'No se pudieron conectar las cuentas de Google.' });
    }
  },
);
