import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { OAuth2Client } from 'google-auth-library';

import type { Application } from '@ats/shared-types';

import { auth } from '../core/firebaseAdmin';
import { oauthEncryptionKey } from '../core/secrets';
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

export const onApplicationCreated = onDocumentCreated(
  {
    document: 'applications/{applicationId}',
    secrets: [oauthEncryptionKey],
  },
  async (event) => {
    const applicationId = event.params.applicationId;

    if (!event.data?.exists) {
      logger.warn(
        `[onApplicationCreated] Evento recibido sin datos para applicationId=${applicationId}. Se omite.`,
      );
      return;
    }

    logger.info(
      `[onApplicationCreated] Procesando applicationId=${applicationId}`,
    );

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
        `[onApplicationCreated] Email de postulación recibida procesado p:ara applicationId=${applicationId}`,
      );
    } catch (error) {
      logger.error(
        `[onApplicationCreated] Error al enviar email de postulación recibida para applicationId=${applicationId}`,
        error,
      );
    }
  },
);
