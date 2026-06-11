import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { google } from 'googleapis';

import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import { UserRepository } from '../repositories/userRepository';

const userRepository = new UserRepository();

/**
 * Registra un canal de notificaciones push de Google Calendar para el recruiter
 * autenticado. Debe llamarse una vez, justo después de que el recruiter conecta
 * su Google Calendar (completa el flujo de exchangeCalendarCode).
 *
 * Google enviará una notificación HTTP a `calendarWebhook` cada vez que haya
 * un cambio en el calendario primary del recruiter.
 *
 * Los canales expiran en 30 días. La Cloud Function `renewCalendarWatches`
 * los renueva automáticamente antes del vencimiento.
 */
export const registerCalendarWatch = onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method Not Allowed.' });
    return;
  }

  try {
    const { uid } = await requireAuthenticatedUser(request);

    // 1. Leer la credencial de Calendar guardada en la Fase 3
    const credential = await userRepository.getCalendarCredential(uid);
    if (!credential) {
      response.status(400).json({
        error:
          'No hay credencial de Google Calendar para este usuario. ' +
          'Completá primero la conexión de Calendar (exchangeCalendarCode).',
      });
      return;
    }

    // 2. Construir el cliente OAuth2 con los tokens guardados
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    );
    oauth2Client.setCredentials({
      access_token: credential.accessToken,
      refresh_token: credential.refreshToken,
      expiry_date: credential.expiresAt,
    });

    // Si el token expiró, google-auth-library lo refresca automáticamente.
    // Guardamos el token actualizado para no tener que refrescarlo la próxima vez.
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await userRepository.updateCalendarCredential(uid, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? credential.refreshToken,
          expiresAt: tokens.expiry_date ?? Date.now() + 3600 * 1000,
        });
      }
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 3. La URL de nuestro webhook (calendarWebhook Cloud Function)
    //    En producción: https://{region}-{projectId}.cloudfunctions.net/calendarWebhook
    //    Se configura como variable de entorno para que funcione en staging y producción.
    const webhookUrl = process.env.CALENDAR_WEBHOOK_URL;
    if (!webhookUrl) {
      response.status(500).json({
        error: 'La variable CALENDAR_WEBHOOK_URL no está configurada.',
      });
      return;
    }

    // 4. Registrar el canal con Google Calendar API
    //    Expira en 30 días (máximo que permite Google).
    const channelId = `${uid}-calendar-watch`;
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    const watchResponse = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: String(expiresAt),
      },
    });

    const resourceId = watchResponse.data.resourceId;
    if (!resourceId) {
      response.status(500).json({
        error: 'Google Calendar no devolvió resourceId al registrar el canal.',
      });
      return;
    }

    // 5. Guardar el canal en Firestore para que el webhook pueda identificar al recruiter
    await userRepository.saveCalendarWatch(uid, {
      channelId,
      resourceId,
      expiresAt,
    });

    logger.info('[registerCalendarWatch] Canal registrado correctamente', {
      uid,
      channelId,
      resourceId,
      expiresAt: new Date(expiresAt).toISOString(),
    });

    response.status(200).json({ ok: true, channelId });
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    logger.error('[registerCalendarWatch] Error registrando canal', error);
    response
      .status(500)
      .json({ error: 'No se pudo registrar el canal de Calendar.' });
  }
});
