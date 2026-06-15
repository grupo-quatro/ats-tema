import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import type { calendar_v3 } from 'googleapis';
import { google } from 'googleapis';

import { handleCorsPreflightAndVerifyMethod } from '../core/cors';
import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import { oauthEncryptionKey, calendarWebhookSecret } from '../core/secrets';
import { UserRepository } from '../repositories/userRepository';

const userRepository = new UserRepository();

export const registerCalendarWatch = onRequest(
  { secrets: [oauthEncryptionKey, calendarWebhookSecret] },
  async (request, response) => {
    if (handleCorsPreflightAndVerifyMethod(request, response, 'POST')) return;

    try {
      const { uid } = await requireAuthenticatedUser(request);

      const credential = await userRepository.getCalendarCredential(uid);
      if (!credential) {
        response.status(400).json({
          error:
            'No hay credencial de Google Calendar para este usuario. ' +
            'Completá primero la conexión de Calendar (exchangeCalendarCode).',
        });
        return;
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      );
      oauth2Client.setCredentials({
        access_token: credential.accessToken,
        refresh_token: credential.refreshToken,
        expiry_date: credential.expiresAt,
      });

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

      const existingWatch = await userRepository.getCalendarWatchForUser(uid);
      if (existingWatch) {
        await calendar.channels
          .stop({
            requestBody: {
              id: existingWatch.channelId,
              resourceId: existingWatch.resourceId,
            },
          })
          .catch((err: unknown) => {
            logger.warn(
              '[registerCalendarWatch] No se pudo detener canal anterior',
              { uid, channelId: existingWatch.channelId, err },
            );
          });
      }

      const webhookUrl = process.env.CALENDAR_WEBHOOK_URL;
      if (!webhookUrl) {
        response.status(500).json({
          error: 'La variable CALENDAR_WEBHOOK_URL no está configurada.',
        });
        return;
      }

      const channelId = `${uid}-cw-${Date.now()}`;
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

      const watchResponse = await calendar.events.watch({
        calendarId: 'primary',
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          expiration: String(expiresAt),
          ...(process.env.CALENDAR_WEBHOOK_SECRET
            ? { token: process.env.CALENDAR_WEBHOOK_SECRET }
            : {}),
        },
      });

      const resourceId = watchResponse.data.resourceId;
      if (!resourceId) {
        response.status(500).json({
          error:
            'Google Calendar no devolvió resourceId al registrar el canal.',
        });
        return;
      }

      await userRepository.saveCalendarWatch(uid, {
        channelId,
        resourceId,
        expiresAt,
      });

      const initialSyncToken = await fetchInitialSyncToken(calendar);
      if (initialSyncToken) {
        await userRepository.saveCalendarSyncToken(uid, initialSyncToken);
      }

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
  },
);

async function fetchInitialSyncToken(
  calendar: calendar_v3.Calendar,
): Promise<string | null> {
  let pageToken: string | undefined;
  let syncToken: string | null = null;
  const timeMin = new Date().toISOString();
  do {
    const resp = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      singleEvents: true,
      maxResults: 250,
      ...(pageToken ? { pageToken } : {}),
    });
    syncToken = resp.data.nextSyncToken ?? null;
    pageToken = resp.data.nextPageToken ?? undefined;
  } while (pageToken);
  return syncToken;
}
