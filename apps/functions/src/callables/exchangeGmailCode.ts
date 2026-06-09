import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { OAuth2Client } from 'google-auth-library';

import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import { UserRepository } from '../repositories/userRepository';
import { ExchangeGmailCodeService } from '../services/exchangeGmailCodeService';
import {
  validateExchangeGmailCodePayload,
  ExchangeGmailCodeValidationError,
} from '../validators/exchangeGmailCodeValidator';

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
);

const userRepository = new UserRepository();
const exchangeGmailCodeService = new ExchangeGmailCodeService(
  userRepository,
  oauth2Client,
);

export const exchangeGmailCode = onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

    validateExchangeGmailCodePayload(request.body);

    const { code, redirectUri } = request.body;

    await exchangeGmailCodeService.exchange(uid, code, redirectUri);

    logger.info('[exchangeGmailCode] Credencial de Gmail guardada', { uid });

    response.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof ExchangeGmailCodeValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }

    logger.error(
      '[exchangeGmailCode] Error intercambiando código de Gmail',
      error,
    );
    response
      .status(500)
      .json({ error: 'No se pudo conectar la cuenta de Gmail.' });
  }
});
