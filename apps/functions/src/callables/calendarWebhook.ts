import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import { UserRepository } from '../repositories/userRepository';
import { processCalendarNotification } from '../services/calendarWebhookService';

const userRepository = new UserRepository();

/**
 * Endpoint receptor de notificaciones push de Google Calendar.
 * Google lo llama cada vez que hay un cambio en el calendario primary
 * de un recruiter que registró un canal con `registerCalendarWatch`.
 *
 * NO requiere autenticación Bearer — Google envía headers propios:
 *   X-Goog-Channel-ID      → identifica el canal (y por ende el recruiter)
 *   X-Goog-Resource-State  → 'sync' (setup) | 'exists' (cambio real)
 *   X-Goog-Channel-Token   → token secreto configurado al registrar el canal
 */
export const calendarWebhook = onRequest(
  { secrets: ['OAUTH_ENCRYPTION_KEY', 'CALENDAR_WEBHOOK_SECRET'] },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    const channelId = request.headers['x-goog-channel-id'] as
      | string
      | undefined;
    const resourceState = request.headers['x-goog-resource-state'] as
      | string
      | undefined;
    const channelToken = request.headers['x-goog-channel-token'] as
      | string
      | undefined;

    if (!channelId) {
      logger.warn('[calendarWebhook] Notificación sin X-Goog-Channel-ID');
      response.status(400).send('Missing channel id');
      return;
    }

    const expectedSecret = process.env.CALENDAR_WEBHOOK_SECRET;
    if (expectedSecret && channelToken !== expectedSecret) {
      logger.warn('[calendarWebhook] Token de canal inválido', { channelId });
      response.status(200).send('OK');
      return;
    }

    const watchRecord = await userRepository
      .getCalendarWatchByChannelId(channelId)
      .catch((err) => {
        logger.error('[calendarWebhook] Error buscando calendarWatch', err);
        return null;
      });

    if (!watchRecord) {
      logger.warn('[calendarWebhook] channelId desconocido', { channelId });
      response.status(200).send('OK');
      return;
    }

    if (resourceState === 'sync') {
      logger.info('[calendarWebhook] Notificación de sync', {
        channelId,
        uid: watchRecord.uid,
      });
      response.status(200).send('OK');
      return;
    }

    logger.info('[calendarWebhook] Cambio detectado', {
      channelId,
      uid: watchRecord.uid,
      resourceState,
    });

    // Responder 200 inmediatamente — Google requiere respuesta en < 30 segundos.
    response.status(200).send('OK');

    await processCalendarNotification(watchRecord.uid).catch((err) => {
      logger.error('[calendarWebhook] Error procesando notificación', {
        uid: watchRecord.uid,
        error: err,
      });
    });
  },
);
