import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

type Response = Parameters<Parameters<typeof onRequest>[0]>[1];

function getAllowedOrigin(): string {
  if (process.env.FUNCTIONS_EMULATOR === 'true') return '*';

  const origin = process.env.ALLOWED_ORIGIN;
  if (!origin) {
    logger.warn(
      'ALLOWED_ORIGIN no está configurado — usando * como fallback. Configurar en producción.',
    );
    return '*';
  }
  return origin;
}

export function setCorsHeaders(response: Response): void {
  response.set('Access-Control-Allow-Origin', getAllowedOrigin());
  response.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function handleCorsPreflightAndVerifyMethod(
  request: { method: string },
  response: Response,
  allowedMethod: string,
): boolean {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return true;
  }

  if (request.method !== allowedMethod) {
    response.status(405).json({ error: 'Method Not Allowed.' });
    return true;
  }

  return false;
}
