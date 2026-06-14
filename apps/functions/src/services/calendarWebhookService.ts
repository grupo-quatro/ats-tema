import { logger } from 'firebase-functions';
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
import { JobsRepository } from '../repositories/jobsRepository';
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
const jobsRepository = new JobsRepository();

// Singleton de módulo — usar .once('tokens') para no acumular listeners entre invocaciones.
const calendarOauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
);

export async function processCalendarNotification(
  recruiterUid: string,
): Promise<void> {
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

  // Guardar nuevo syncToken para la próxima notificación
  if (eventsResponse.data.nextSyncToken) {
    await userRepository
      .saveCalendarSyncToken(recruiterUid, eventsResponse.data.nextSyncToken)
      .catch((err) =>
        logger.error('[calendarWebhookService] Error guardando syncToken', {
          recruiterUid,
          err,
        }),
      );
  }

  const events = eventsResponse.data.items ?? [];

  if (events.length === 0) {
    logger.info('[calendarWebhookService] Sin eventos nuevos', {
      recruiterUid,
    });
    return;
  }

  for (const event of events) {
    const eventId = event.id;
    if (!eventId) continue;

    // Buscar el email del candidato entre los asistentes externos del evento.
    const attendeeEmail =
      (event.attendees ?? []).find((a) => !a.self)?.email ?? null;

    if (!attendeeEmail) {
      logger.info(
        '[calendarWebhookService] Evento sin asistente externo — ignorado',
        { eventId },
      );
      continue;
    }

    await matchAndTransition({ recruiterUid, eventId, attendeeEmail }).catch(
      (err) => {
        logger.error('[calendarWebhookService] Error procesando evento', {
          eventId,
          error: err,
        });
      },
    );
  }
}

async function matchAndTransition(params: {
  recruiterUid: string;
  eventId: string;
  attendeeEmail: string;
}): Promise<void> {
  const { recruiterUid, eventId, attendeeEmail } = params;

  const application =
    await applicationsRepository.findActiveInSchedulingByEmail(
      attendeeEmail,
      SCHEDULING_STAGES,
    );

  if (!application) {
    logger.info(
      '[calendarWebhookService] Sin aplicación activa en scheduling para asistente',
      {
        attendeeEmail,
      },
    );
    return;
  }

  // B3: Verificar que la postulación pertenece al recruiter cuyo calendario
  // detectó el evento. Evita avanzar postulaciones de otros recruiters.
  const job = await jobsRepository.findById(application.jobId);
  if (!job || job.hiringManagerId !== recruiterUid) {
    logger.info(
      '[calendarWebhookService] Postulación no pertenece a este recruiter — ignorada',
      {
        applicationId: application.id,
        jobId: application.jobId,
        recruiterUid,
        jobHiringManager: job?.hiringManagerId,
      },
    );
    return;
  }

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

  await updateService.updateStage(
    { applicationId, stage: nextStage },
    recruiterUid,
  );

  logger.info('[calendarWebhookService] Aplicación transicionada', {
    applicationId,
    stage: nextStage,
  });
}
