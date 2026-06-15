import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

import {
  findNextStageForTrigger,
  GMAIL_STATUS,
  STAGE_CONFIG,
} from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';
import { ApplicationsRepository } from '../repositories/applicationRepository';
import { EmailLogRepository } from '../repositories/emailLogRepository';
import { EmailTemplateRepository } from '../repositories/emailTemplateRepository';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { OrgConfigRepository } from '../repositories/orgConfigRepository';
import { UserRepository } from '../repositories/userRepository';
import { GmailSenderService } from './gmailSenderService';
import { StageEmailService } from './stageEmailService';
import { TemplateResolverService } from './templateResolverService';
import { UpdateApplicationStageService } from './updateApplicationService';

// Etapas de scheduling — stages cuya clave empieza con 'schedule_'.
const SCHEDULING_STAGES = Object.keys(STAGE_CONFIG).filter((stage) =>
  stage.startsWith('schedule_'),
);

const userRepository = new UserRepository();
const applicationsRepository = new ApplicationsRepository();
const employeeRepository = new EmployeeRepository();

export async function processCalendarNotification(
  recruiterUid: string,
): Promise<void> {
  const calendarOauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );

  const credential = await userRepository.getCalendarCredential(recruiterUid);
  if (!credential) {
    logger.warn('[calendarWebhookService] Recruiter sin calendarCredential', {
      recruiterUid,
    });
    return;
  }

  calendarOauth2Client.setCredentials({
    access_token: credential.accessToken,
    refresh_token: credential.refreshToken,
    expiry_date: credential.expiresAt,
  });

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

  // Usar syncToken para procesamiento incremental — evita depender de una ventana de tiempo.
  // Si el token expiró (410), Google requiere un full sync para obtener uno nuevo.
  const syncToken = await userRepository.getCalendarSyncToken(recruiterUid);

  let eventsResponse;
  try {
    eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      ...(syncToken
        ? { syncToken }
        : { updatedMin: new Date(Date.now() - 10 * 60 * 1000).toISOString() }),
      singleEvents: true,
    });
  } catch (err) {
    const status =
      err instanceof Error && 'status' in err
        ? (err as { status: number }).status
        : null;

    if (status === 410) {
      // syncToken expirado — hacer full sync para obtener nuevo token
      logger.info('[calendarWebhookService] syncToken expirado, full sync', {
        recruiterUid,
      });
      try {
        eventsResponse = await calendar.events.list({
          calendarId: 'primary',
          updatedMin: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          singleEvents: true,
        });
      } catch (fullSyncErr) {
        logger.error('[calendarWebhookService] Error en full sync', {
          recruiterUid,
          err: fullSyncErr,
        });
        return;
      }
    } else {
      const isRevoked =
        err instanceof Error && err.message.includes('invalid_grant');
      if (isRevoked) {
        logger.warn('[calendarWebhookService] Token revocado para recruiter', {
          recruiterUid,
        });
        await employeeRepository.setCalendarStatus(
          recruiterUid,
          GMAIL_STATUS.DISCONNECTED,
        );
      } else {
        logger.error('[calendarWebhookService] Error listando eventos', {
          recruiterUid,
          err,
        });
      }
      return;
    }
  }

  // Procesar todas las páginas; persistir el syncToken solo al terminar
  let currentResponse = eventsResponse;
  let nextSyncToken: string | null | undefined;

  while (true) {
    const events = currentResponse.data.items ?? [];

    if (events.length === 0 && !currentResponse.data.nextPageToken) {
      logger.info('[calendarWebhookService] Sin eventos nuevos', {
        recruiterUid,
      });
    }

    for (const event of events) {
      const eventId = event.id;
      if (!eventId) continue;

      if (event.status === 'cancelled') {
        logger.info('[calendarWebhookService] Evento cancelado — ignorado', {
          eventId,
        });
        continue;
      }

      // Solo el primer asistente externo que aceptó la invitación
      const attendee = (event.attendees ?? []).find(
        (a) => !a.self && a.responseStatus === 'accepted',
      );

      if (!attendee?.email) {
        logger.info(
          '[calendarWebhookService] Evento sin asistente externo aceptado — ignorado',
          { eventId },
        );
        continue;
      }

      const attendeeEmail = attendee.email;

      await matchAndTransition({ recruiterUid, eventId, attendeeEmail }).catch(
        (err) => {
          logger.error('[calendarWebhookService] Error procesando evento', {
            eventId,
            error: err,
          });
        },
      );
    }

    nextSyncToken = currentResponse.data.nextSyncToken;
    const nextPageToken = currentResponse.data.nextPageToken;
    if (!nextPageToken) break;

    currentResponse = await calendar.events.list({
      calendarId: 'primary',
      pageToken: nextPageToken,
      singleEvents: true,
    });
  }

  // Guardar syncToken después de procesar todos los eventos de todas las páginas
  if (nextSyncToken) {
    await userRepository
      .saveCalendarSyncToken(recruiterUid, nextSyncToken)
      .catch((err) =>
        logger.error('[calendarWebhookService] Error guardando syncToken', {
          recruiterUid,
          err,
        }),
      );
  }
}

async function matchAndTransition(params: {
  recruiterUid: string;
  eventId: string;
  attendeeEmail: string;
}): Promise<void> {
  const { recruiterUid, eventId, attendeeEmail } = params;

  const applications =
    await applicationsRepository.findAllActiveInSchedulingByEmail(
      attendeeEmail,
      SCHEDULING_STAGES,
      recruiterUid,
    );

  if (applications.length === 0) {
    logger.info(
      '[calendarWebhookService] Sin aplicación activa en scheduling para este recruiter',
      { attendeeEmail, recruiterUid },
    );
    return;
  }

  const application = applications[0];

  const applicationId = application.id;
  const applicationRef = db.collection('applications').doc(applicationId);

  // B6: Idempotencia atómica — solo un webhook puede reclamar el eventId.
  // La transacción garantiza que dos webhooks concurrentes no procesen el mismo evento.
  let shouldProcess = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(applicationRef);
    if (!snap.exists) return;
    if (snap.data()?.calendarEventId === eventId) return;
    tx.update(applicationRef, { calendarEventId: eventId });
    shouldProcess = true;
  });

  if (!shouldProcess) {
    logger.info('[calendarWebhookService] Evento ya procesado (idempotencia)', {
      applicationId,
      eventId,
    });
    return;
  }

  const nextStage = findNextStageForTrigger(
    application.stage,
    'on_calendar_event',
  );

  if (!nextStage) {
    logger.warn('[calendarWebhookService] No se encontró siguiente etapa', {
      currentStage: application.stage,
      applicationId,
    });
    return;
  }

  logger.info('[calendarWebhookService] Transicionando aplicación', {
    applicationId,
    from: application.stage,
    to: nextStage,
    attendeeEmail,
    eventId,
  });

  const gmailOauth2Client = new OAuth2Client(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );

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

  try {
    await updateService.updateStage(
      { applicationId, stage: nextStage },
      recruiterUid,
    );
  } catch (err) {
    // Liberar el reclamo para que el próximo webhook pueda reintentar
    await applicationRef
      .update({ calendarEventId: FieldValue.delete() })
      .catch((deleteErr) =>
        logger.error(
          '[calendarWebhookService] Error liberando reclamo de evento',
          { applicationId, eventId, deleteErr },
        ),
      );
    throw err;
  }

  logger.info('[calendarWebhookService] Aplicación transicionada', {
    applicationId,
    stage: nextStage,
  });
}
