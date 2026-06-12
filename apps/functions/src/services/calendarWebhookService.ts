import { logger } from 'firebase-functions';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

import { findNextStageForTrigger, GMAIL_STATUS } from '@ats/shared-types';

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

const userRepository = new UserRepository();
const applicationsRepository = new ApplicationsRepository();
const employeeRepository = new EmployeeRepository();

// Singleton de módulo — usar .once('tokens') para no acumular listeners entre invocaciones.
const calendarOauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
);

/**
 * Dado el uid del recruiter, lista los eventos recientes de su calendario
 * y transiciona las aplicaciones que correspondan.
 */
export async function processCalendarNotification(
  recruiterUid: string,
): Promise<void> {
  const credential = await userRepository.getCalendarCredential(recruiterUid);
  if (!credential) {
    logger.warn('[calendarWebhookService] Recruiter sin calendarCredential', { recruiterUid });
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

  const calendar = google.calendar({ version: 'v3', auth: calendarOauth2Client });
  const updatedMin = new Date(Date.now() - 3 * 60 * 1000).toISOString();

  let eventsResponse;
  try {
    eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      updatedMin,
      singleEvents: true,
      orderBy: 'updated',
    });
  } catch (err) {
    const isRevoked = err instanceof Error && err.message.includes('invalid_grant');
    if (isRevoked) {
      logger.warn('[calendarWebhookService] Token revocado para recruiter', { recruiterUid });
      await employeeRepository.setCalendarStatus(recruiterUid, GMAIL_STATUS.DISCONNECTED);
    } else {
      logger.error('[calendarWebhookService] Error listando eventos', { recruiterUid, err });
    }
    return;
  }

  const events = eventsResponse.data.items ?? [];

  if (events.length === 0) {
    logger.info('[calendarWebhookService] Sin eventos nuevos', { recruiterUid });
    return;
  }

  for (const event of events) {
    const eventId = event.id;
    if (!eventId) continue;

    // Extraer applicationId del campo description del evento.
    // stageEmailService appendea ?description=ats-app-{applicationId} al calendarLink.
    // Google Appointments copia ese parámetro en la descripción del evento creado.
    const match = (event.description ?? '').match(/ats-app-([a-zA-Z0-9_-]+)/);
    const applicationId = match?.[1] ?? null;

    if (!applicationId) {
      logger.info('[calendarWebhookService] Evento sin applicationId en description — ignorado', {
        eventId,
      });
      continue;
    }

    await matchAndTransition({ recruiterUid, eventId, applicationId }).catch((err) => {
      logger.error('[calendarWebhookService] Error procesando evento', { eventId, error: err });
    });
  }
}

async function matchAndTransition(params: {
  recruiterUid: string;
  eventId: string;
  applicationId: string;
}): Promise<void> {
  const { recruiterUid, eventId, applicationId } = params;

  const application = await applicationsRepository.findById(applicationId);
  if (!application) {
    logger.info('[calendarWebhookService] applicationId no encontrado', { applicationId });
    return;
  }

  if (application.calendarEventId === eventId) {
    logger.info('[calendarWebhookService] Evento ya procesado', { applicationId, eventId });
    return;
  }

  const nextStage = findNextStageForTrigger(application.stage, 'on_calendar_event');

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

  await updateService.updateStage({ applicationId, stage: nextStage }, recruiterUid);

  // Guardar calendarEventId DESPUÉS de la transición exitosa (idempotencia correcta).
  await applicationsRepository.update(applicationId, { calendarEventId: eventId });

  logger.info('[calendarWebhookService] Aplicación transicionada', { applicationId, stage: nextStage });
}
