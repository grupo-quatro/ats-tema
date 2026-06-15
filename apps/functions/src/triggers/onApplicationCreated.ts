import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { OAuth2Client } from 'google-auth-library';

import type { Application } from '@ats/shared-types';

import { auth } from '../core/firebaseAdmin';
import { CandidatesRepository } from '../repositories/candidateRepository';
import { EmailLogRepository } from '../repositories/emailLogRepository';
import { EmailTemplateRepository } from '../repositories/emailTemplateRepository';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { JobsRepository } from '../repositories/jobRepository';
import { OrgConfigRepository } from '../repositories/orgConfigRepository';
import { UserRepository } from '../repositories/userRepository';
import { GmailSenderService } from '../services/gmailSenderService';
import {
  SkillMatchService,
  SkillMatchServiceError,
} from '../services/skillMatchService';
import { StageEmailService } from '../services/stageEmailService';
import { TemplateResolverService } from '../services/templateResolverService';

const skillMatchService = new SkillMatchService();

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
);

const stageEmailService = new StageEmailService(
  new EmailTemplateRepository(),
  new EmailLogRepository(),
  new UserRepository(),
  new OrgConfigRepository(),
  new TemplateResolverService(),
  new GmailSenderService(),
  oauth2Client,
  new EmployeeRepository(),
);

const jobsRepository = new JobsRepository();
const candidatesRepository = new CandidatesRepository();

/**
 * Trigger Firestore (Background Trigger) — se ejecuta automáticamente
 * cada vez que se crea un nuevo documento en la colección `applications`.
 *
 * Responsabilidades:
 *  - Calcula el skill match via SkillMatchService.
 *  - Envía el email de "postulación recibida" (template: application_received)
 *    usando las credenciales de Gmail del hiring manager del job.
 *  - Los fallos de email se loguean pero nunca interrumpen ni reintentan el trigger.
 */
export const onApplicationCreated = onDocumentCreated(
  {
    document: 'applications/{applicationId}',
    secrets: ['OAUTH_ENCRYPTION_KEY'],
  },
  async (event) => {
    const applicationId = event.params.applicationId;

    // Guardia temprana: si el snapshot no trae datos, no hay nada que procesar
    if (!event.data?.exists) {
      logger.warn(
        `[onApplicationCreated] Evento recibido sin datos para applicationId=${applicationId}. Se omite.`,
      );
      return;
    }

    logger.info(
      `[onApplicationCreated] Procesando applicationId=${applicationId}`,
    );

    // 1. Calcular skill match (comportamiento original)
    try {
      await skillMatchService.calculateAndPersist(applicationId);
      logger.info(
        `[onApplicationCreated] Match calculado correctamente para applicationId=${applicationId}`,
      );
    } catch (error) {
      if (error instanceof SkillMatchServiceError) {
        logger.error(
          `[onApplicationCreated] Error de negocio al calcular match para applicationId=${applicationId}: ${error.message}`,
          { cause: error.cause },
        );
        return;
      }
      logger.error(
        `[onApplicationCreated] Error inesperado al calcular match para applicationId=${applicationId}`,
        error,
      );
      throw error;
    }

    // 2. Enviar email de "postulación recibida" — el fallo nunca bloquea ni reintenta
    try {
      const rawData = event.data.data() as Omit<Application, 'id'>;
      const application: Application = { id: applicationId, ...rawData };

      const [job, candidate] = await Promise.all([
        jobsRepository.findById(application.jobId),
        candidatesRepository.findById(application.candidateId),
      ]);

      if (!job || !candidate) {
        logger.warn(
          `[onApplicationCreated] No se encontró job o candidate para applicationId=${applicationId}. Se omite el email.`,
          { jobId: application.jobId, candidateId: application.candidateId },
        );
        return;
      }

      const hiringManagerRecord = await auth
        .getUser(job.hiringManagerId)
        .catch(() => null);

      const hiringManagerEmail =
        hiringManagerRecord?.email ?? job.hiringManagerId;

      await stageEmailService.sendIfTemplateExists(
        application,
        candidate,
        job,
        'applied',
        job.hiringManagerId,
        hiringManagerEmail,
      );

      logger.info(
        `[onApplicationCreated] Email de postulación recibida procesado para applicationId=${applicationId}`,
      );
    } catch (error) {
      logger.error(
        `[onApplicationCreated] Error al enviar email de postulación recibida para applicationId=${applicationId}`,
        error,
      );
    }
  },
);
