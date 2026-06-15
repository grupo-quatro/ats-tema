import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import type { calendar_v3 } from 'googleapis';
import { google } from 'googleapis';

import type { CalendarWatch, GmailCredential } from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';
import { oauthEncryptionKey, calendarWebhookSecret } from '../core/secrets';
import { UserRepository } from '../repositories/userRepository';

const userRepository = new UserRepository();

export const renewCalendarWatches = onSchedule(
  {
    schedule: '0 3 * * *',
    timeZone: 'UTC',
    secrets: [oauthEncryptionKey, calendarWebhookSecret],
  },
  async () => {
    logger.info('[renewCalendarWatches] Iniciando renovación de canales');

    const snapshot = await db
      .collection('users')
      .where('calendarWatch.channelId', '!=', null)
      .get();

    if (snapshot.empty) {
      logger.info('[renewCalendarWatches] No hay canales registrados');
      return;
    }

    logger.info(
      `[renewCalendarWatches] Procesando ${snapshot.docs.length} recruiters`,
    );

    const webhookUrl = process.env.CALENDAR_WEBHOOK_URL;
    if (!webhookUrl) {
      logger.error(
        '[renewCalendarWatches] CALENDAR_WEBHOOK_URL no configurada. Abortando.',
      );
      return;
    }

    const results = await Promise.allSettled(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const watch = data.calendarWatch as CalendarWatch | undefined;
        const credential = await userRepository.getCalendarCredential(doc.id);
        return renewWatchForUser(doc.id, watch, credential, webhookUrl);
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    logger.info(
      `[renewCalendarWatches] Completado. Renovados: ${succeeded}, Fallidos: ${failed}`,
    );
  },
);

async function renewWatchForUser(
  uid: string,
  existingWatch: CalendarWatch | undefined,
  credential: GmailCredential | null | undefined,
  webhookUrl: string,
): Promise<void> {
  if (!credential) {
    logger.warn(
      `[renewCalendarWatches] Sin credencial de Calendar para ${uid}`,
    );
    return;
  }

  if (!existingWatch) {
    logger.warn(`[renewCalendarWatches] Sin calendarWatch para ${uid}`);
    return;
  }

  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  if (existingWatch.expiresAt > Date.now() + TWO_DAYS_MS) {
    logger.info(`[renewCalendarWatches] Canal vigente para ${uid}, se omite`);
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

  await calendar.channels
    .stop({
      requestBody: {
        id: existingWatch.channelId,
        resourceId: existingWatch.resourceId,
      },
    })
    .catch((err: unknown) => {
      logger.warn(
        `[renewCalendarWatches] No se pudo detener canal anterior para ${uid}`,
        { err },
      );
    });

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
    throw new Error(
      `Google no devolvió resourceId al renovar canal para ${uid}`,
    );
  }

  await userRepository.saveCalendarWatch(uid, {
    channelId,
    resourceId,
    expiresAt,
  });

  const newSyncToken = await fetchInitialSyncToken(calendar);
  if (newSyncToken) {
    await userRepository.saveCalendarSyncToken(uid, newSyncToken);
  }

  logger.info(`[renewCalendarWatches] Canal renovado para ${uid}`, {
    channelId,
    expiresAt: new Date(expiresAt).toISOString(),
  });
}

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
