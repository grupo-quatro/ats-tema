import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

import { findNextStageForTrigger } from '@ats/shared-types';

import { ApplicationsRepository } from '../repositories/applicationRepository';
import { EmailLogRepository } from '../repositories/emailLogRepository';
import { EmailTemplateRepository } from '../repositories/emailTemplateRepository';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { OrgConfigRepository } from '../repositories/orgConfigRepository';
import { UserRepository } from '../repositories/userRepository';
import { GmailSenderService } from '../services/gmailSenderService';
import { StageEmailService } from '../services/stageEmailService';
import { TemplateResolverService } from '../services/templateResolverService';
import { UpdateApplicationStageService } from '../services/updateApplicationService';

// Etapas en las que el candidato tiene pendiente confirmar una entrevista.
// El webhook solo actúa cuando la aplicación está en alguna de estas etapas.
const SCHEDULING_STAGES = [
  'schedule_hr_1',
  'schedule_hr_2',
  'schedule_tech_1',
  'schedule_tech_2',
] as const;

const userRepository = new UserRepository();
const applicationsRepository = new ApplicationsRepository();

/**
 * Cliente OAuth2 exclusivo para la Calendar API.
 * Usa `google.auth.OAuth2` de googleapis (compatible con google.calendar).
 * Se inicializa una sola vez como singleton de módulo — usar `.once('tokens')`
 * para evitar acumulación de listeners entre invocaciones.
 */
const calendarOauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
);

/**
 * Endpoint receptor de notificaciones push de Google Calendar.
 * Google lo llama cada vez que hay un cambio en el calendario primary
 * de un recruiter que registró un canal con `registerCalendarWatch`.
 *
 * NO requiere autenticación Bearer — Google envía los headers propios:
 *   X-Goog-Channel-ID    → identifica el canal (y por ende el recruiter)
 *   X-Goog-Resource-State → 'sync' (setup) | 'exists' (cambio real)
 */
export const calendarWebhook = onRequest(async (request, response) => {
  // Google siempre usa POST
  if (request.method !== 'POST') {
    response.status(405).send('Method Not Allowed');
    return;
  }

  const channelId = request.headers['x-goog-channel-id'] as string | undefined;
  const resourceState = request.headers['x-goog-resource-state'] as
    | string
    | undefined;

  // Sin channelId no podemos identificar al recruiter → rechazamos
  if (!channelId) {
    logger.warn('[calendarWebhook] Notificación sin X-Goog-Channel-ID');
    response.status(400).send('Missing channel id');
    return;
  }

  // 1. Verificar que el channelId pertenece a uno de nuestros recruiters.
  //    Esto evita que cualquiera haga POST al webhook y dispare lógica de negocio.
  const watchRecord = await userRepository
    .getCalendarWatchByChannelId(channelId)
    .catch((err) => {
      logger.error('[calendarWebhook] Error buscando calendarWatch', err);
      return null;
    });

  if (!watchRecord) {
    logger.warn('[calendarWebhook] channelId desconocido', { channelId });
    response.status(200).send('OK'); // Respondemos 200 para que Google no reintente
    return;
  }

  // 2. La primera notificación tras registrar el canal es de tipo 'sync'.
  //    Google la envía para confirmar que el webhook está activo. Solo respondemos 200.
  if (resourceState === 'sync') {
    logger.info('[calendarWebhook] Notificación de sync recibida', {
      channelId,
      uid: watchRecord.uid,
    });
    response.status(200).send('OK');
    return;
  }

  logger.info('[calendarWebhook] Notificación de cambio recibida', {
    channelId,
    uid: watchRecord.uid,
    resourceState,
  });

  // Procesamos de forma asíncrona y respondemos 200 inmediatamente.
  // Google requiere respuesta en < 30 segundos; si tardamos más reintenta.
  response.status(200).send('OK');

  await processCalendarNotification(watchRecord.uid).catch((err) => {
    logger.error('[calendarWebhook] Error procesando notificación', {
      uid: watchRecord.uid,
      error: err,
    });
  });
});

/**
 * Lógica principal: dado el uid del recruiter, lista los eventos recientes
 * de su calendario y transiciona las aplicaciones que correspondan.
 */
async function processCalendarNotification(
  recruiterUid: string,
): Promise<void> {
  // 3. Obtener y refrescar el token OAuth del recruiter
  const credential = await userRepository.getCalendarCredential(recruiterUid);
  if (!credential) {
    logger.warn('[calendarWebhook] Recruiter sin calendarCredential', {
      recruiterUid,
    });
    return;
  }

  calendarOauth2Client.setCredentials({
    access_token: credential.accessToken,
    refresh_token: credential.refreshToken,
    expiry_date: credential.expiresAt,
  });

  // Si el access token expiró, google-auth-library lo refresca automáticamente.
  // Guardamos el token actualizado en Firestore.
  // once en vez de on: calendarOauth2Client es singleton de módulo, on acumularía listeners
  calendarOauth2Client.once('tokens', async (tokens) => {
    if (tokens.access_token) {
      await userRepository.updateCalendarCredential(recruiterUid, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? credential.refreshToken,
        expiresAt: tokens.expiry_date ?? Date.now() + 3600 * 1000,
      });
    }
  });

  const calendar = google.calendar({
    version: 'v3',
    auth: calendarOauth2Client,
  });

  // 4. Listar eventos modificados en los últimos 3 minutos.
  //    Usamos una ventana corta para no procesar eventos viejos.
  const updatedMin = new Date(Date.now() - 3 * 60 * 1000).toISOString();

  const eventsResponse = await calendar.events.list({
    calendarId: 'primary',
    updatedMin,
    singleEvents: true,
    orderBy: 'updated',
  });

  const events = eventsResponse.data.items ?? [];

  if (events.length === 0) {
    logger.info('[calendarWebhook] Sin eventos nuevos', { recruiterUid });
    return;
  }

  // 5. Para cada evento nuevo, buscar si algún asistente es candidato con
  //    una aplicación activa en etapa de scheduling.
  for (const event of events) {
    const attendees = event.attendees ?? [];
    const eventId = event.id;

    if (!eventId) continue;

    for (const attendee of attendees) {
      const attendeeEmail = attendee.email;
      if (!attendeeEmail) continue;

      // Organizer es el propio recruiter — lo saltamos
      if (attendee.self) continue;

      await matchAndTransition({
        recruiterUid,
        attendeeEmail,
        eventId,
      }).catch((err) => {
        logger.error('[calendarWebhook] Error procesando asistente', {
          attendeeEmail,
          eventId,
          error: err,
        });
      });
    }
  }
}

/**
 * Dado el email de un asistente al evento, busca si existe una aplicación
 * activa del candidato en una etapa de scheduling y la transiciona.
 */
async function matchAndTransition(params: {
  recruiterUid: string;
  attendeeEmail: string;
  eventId: string;
}): Promise<void> {
  const { recruiterUid, attendeeEmail, eventId } = params;

  // Buscar aplicación activa de este candidato en etapas de scheduling
  const application =
    await applicationsRepository.findActiveInSchedulingByEmail(
      attendeeEmail,
      SCHEDULING_STAGES,
    );

  if (!application) {
    logger.info('[calendarWebhook] Sin aplicación activa para asistente', {
      attendeeEmail,
    });
    return;
  }

  const applicationId = application.id;

  // Evitar procesar el mismo evento dos veces
  if (application.calendarEventId === eventId) {
    logger.info('[calendarWebhook] Evento ya procesado', {
      applicationId,
      eventId,
    });
    return;
  }

  // Resolver la siguiente etapa usando la lógica ya definida en stageConfig
  const nextStage = findNextStageForTrigger(
    application.stage,
    'on_calendar_event',
  );

  if (!nextStage) {
    logger.warn('[calendarWebhook] No se encontró siguiente etapa', {
      currentStage: application.stage,
      applicationId,
    });
    return;
  }

  logger.info('[calendarWebhook] Transicionando aplicación', {
    applicationId,
    from: application.stage,
    to: nextStage,
    attendeeEmail,
    eventId,
  });

  // Guardar el calendarEventId antes de la transición para idempotencia
  await applicationsRepository.update(applicationId, {
    calendarEventId: eventId,
  });

  // Cliente OAuth2 para Gmail — separado del cliente de Calendar para evitar que
  // StageEmailService sobreescriba las credenciales del calendario.
  // Usa OAuth2Client de google-auth-library (compatible con StageEmailService).
  const gmailOauth2Client = new OAuth2Client(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );

  // Construir el servicio de stage con el email service completo,
  // igual que hace el callable updateApplicationStage.
  const updateService = new UpdateApplicationStageService(
    undefined,
    undefined,
    undefined,
    new StageEmailService(
      new EmailTemplateRepository(),
      new EmailLogRepository(),
      new UserRepository(),
      new OrgConfigRepository(),
      new TemplateResolverService(),
      new GmailSenderService(),
      gmailOauth2Client,
      new EmployeeRepository(),
    ),
  );

  // El changedBy es el recruiter dueño del calendario
  await updateService.updateStage(
    { applicationId, stage: nextStage },
    recruiterUid,
  );

  logger.info('[calendarWebhook] Aplicación transicionada correctamente', {
    applicationId,
    stage: nextStage,
  });
}
