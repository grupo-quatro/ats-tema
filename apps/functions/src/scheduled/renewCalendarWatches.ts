import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { google } from 'googleapis';

import type { CalendarWatch, GmailCredential } from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';
import { UserRepository } from '../repositories/userRepository';

const userRepository = new UserRepository();

/**
 * Renueva los canales de notificaciones push de Google Calendar de todos los
 * recruiters antes de que expiren. Corre cada 29 días (los canales duran 30).
 *
 * Lógica por recruiter:
 * 1. Leer calendarWatch y calendarCredential desde el doc ya leído
 * 2. Si el canal vence en < 2 días, renovar
 * 3. Llamar calendar.events.watch() con el mismo channelId
 * 4. Actualizar expiresAt en Firestore
 *
 * Si falla para un recruiter, se loguea y continúa con el resto.
 */
export const renewCalendarWatches = onSchedule(
  // Corre cada 29 días — los canales de Google duran 30 días, esto garantiza
  // renovación antes del vencimiento independientemente del día de creación.
  { schedule: '0 3 */29 * *', timeZone: 'UTC' },
  async () => {
    logger.info('[renewCalendarWatches] Iniciando renovación de canales');

    // Buscar todos los usuarios que tienen un calendarWatch registrado
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
      snapshot.docs.map((doc) => {
        const data = doc.data();
        // Leemos los campos directamente del doc — sin queries extra
        const watch = data.calendarWatch as CalendarWatch | undefined;
        const credential = data.calendarCredential as
          | GmailCredential
          | undefined;
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
  credential: GmailCredential | undefined,
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

  // Solo renovar si vence en < 2 días (margen de seguridad)
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

  // Guardar token refrescado automáticamente si expiró
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

  // Detener el canal anterior para evitar acumular canales huérfanos en Google.
  // Si falla (canal ya expirado o desconocido), lo ignoramos y seguimos.
  await calendar.channels.stop({
    requestBody: {
      id: existingWatch.channelId,
      resourceId: existingWatch.resourceId,
    },
  }).catch((err: unknown) => {
    logger.warn(`[renewCalendarWatches] No se pudo detener canal anterior para ${uid}`, { err });
  });

  const channelId = `${uid}-calendar-watch`;
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

  logger.info(`[renewCalendarWatches] Canal renovado para ${uid}`, {
    channelId,
    expiresAt: new Date(expiresAt).toISOString(),
  });
}
