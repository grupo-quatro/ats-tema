import { logger } from 'firebase-functions';

import type { OAuth2Client } from 'google-auth-library';

import type {
  Application,
  ApplicationStage,
  Candidate,
  CreateEmailLogDTO,
  GmailCredential,
  Job,
} from '@ats/shared-types';
import { STAGE_CONFIG } from '@ats/shared-types';

import type { IEmailLogRepository } from '../repositories/emailLogRepository';
import type { IEmailTemplateRepository } from '../repositories/emailTemplateRepository';
import type { IEmployeeRepository } from '../repositories/employeeRepository';
import type { IOrgConfigRepository } from '../repositories/orgConfigRepository';
import type { IUserRepository } from '../repositories/userRepository';
import type { GmailSenderService } from './gmailSenderService';
import type {
  ResolverContext,
  TemplateResolverService,
} from './templateResolverService';

export class StageEmailService {
  constructor(
    private readonly emailTemplateRepository: IEmailTemplateRepository,
    private readonly emailLogRepository: IEmailLogRepository,
    private readonly userRepository: IUserRepository,
    private readonly orgConfigRepository: IOrgConfigRepository,
    private readonly templateResolver: TemplateResolverService,
    private readonly gmailSender: GmailSenderService,
    private readonly oauth2Client: OAuth2Client,
    private readonly employeeRepository?: IEmployeeRepository,
  ) {}

  async sendIfTemplateExists(
    application: Application,
    candidate: Candidate,
    job: Job,
    newStage: ApplicationStage,
    recruiterId: string,
    recruiterEmail: string,
    offerLink = '',
    offerId?: string,
  ): Promise<boolean> {
    try {
      //  Resolver emailTemplateStage si es null no hay comunicaciones para esa etapa
      const { emailTemplateStage } = STAGE_CONFIG[newStage];
      if (emailTemplateStage === null) {
        return false;
      }
      if (emailTemplateStage === 'offer' && !offerLink) {
        return false;
      }

      // Busca templates para la etapa.
      const template =
        await this.emailTemplateRepository.findByStage(emailTemplateStage);
      if (!template) {
        logger.warn('StageEmailService: no hay template configurado', {
          stage: newStage,
          emailTemplateStage,
          applicationId: application.id,
        });
        return false;
      }

      const [orgConfig, credential, calendarLink] = await Promise.all([
        this.orgConfigRepository.get(),
        this.userRepository.getGmailCredential(recruiterId),
        this.employeeRepository?.getCalendarLink(recruiterId) ??
          Promise.resolve(null),
      ]);

      const candidateName =
        [candidate.firstName, candidate.lastName].filter(Boolean).join(' ') ||
        candidate.fullName ||
        candidate.email ||
        '';

      const context: ResolverContext = {
        candidateName,
        positionName: job.title,
        recruiterName: recruiterEmail,
        recruiterEmail,
        calendarLink: calendarLink ?? '',
        companyName: orgConfig.companyName,
        offerLink,
      };

      const { subject, body } = this.templateResolver.resolve(
        template,
        context,
      );

      const candidateEmail = candidate.email ?? '';
      const logDto: CreateEmailLogDTO = {
        ...(offerId && { offerId }),
        applicationId: application.id,
        candidateId: application.candidateId,
        candidateEmail,
        jobId: application.jobId,
        templateId: template.id,
        templateName: template.name,
        stage: newStage,
        subject,
        body,
        status: 'pending',
        recruiterId,
        recruiterEmail,
        attemptedAt: new Date(),
      };

      const logId = await this.emailLogRepository.create(logDto);

      // Si el recruiter no tiene Gmail conectado, marcar log como failed y salir
      if (!credential) {
        await this.emailLogRepository.updateStatus(logId, {
          status: 'failed',
          error:
            'El reclutador no tiene una cuenta de Gmail conectada. ' +
            'Conecta tu cuenta en Configuración → Gmail.',
        });
        return false;
      }

      // 7. Refrescar accessToken si está próximo a vencer
      let freshCredential: GmailCredential;
      try {
        freshCredential = await this.refreshIfNeeded(credential, recruiterId);
      } catch (refreshError) {
        logger.error(
          'StageEmailService: no se pudo refrescar el token de Gmail',
          {
            recruiterId,
            error: refreshError,
          },
        );
        await this.emailLogRepository.updateStatus(logId, {
          status: 'failed',
          error: 'No se pudo refrescar el token de acceso de Gmail.',
        });
        return false;
      }

      try {
        await this.gmailSender.send({
          accessToken: freshCredential.accessToken,
          to: candidateEmail,
          subject,
          htmlBody: body,
        });

        await this.emailLogRepository.updateStatus(logId, { status: 'sent' });
        return true;
      } catch (sendError) {
        const errorMessage =
          sendError instanceof Error
            ? sendError.message
            : 'Error desconocido al enviar el email.';

        logger.error('StageEmailService: error al enviar email vía Gmail', {
          stage: newStage,
          applicationId: application.id,
          error: sendError,
        });

        await this.emailLogRepository.updateStatus(logId, {
          status: 'failed',
          error: errorMessage,
        });
        return false;
      }
    } catch (error) {
      logger.error(
        'StageEmailService: error inesperado en sendIfTemplateExists',
        {
          stage: newStage,
          applicationId: application.id,
          error,
        },
      );
      return false;
    }
  }

  private async refreshIfNeeded(
    credential: GmailCredential,
    recruiterId: string,
  ): Promise<GmailCredential> {
    const BUFFER_MS = 5 * 60 * 1000; // 5 minutos de margen
    if (credential.expiresAt > Date.now() + BUFFER_MS) {
      return credential;
    }

    this.oauth2Client.setCredentials({
      refresh_token: credential.refreshToken,
    });

    const response = await this.oauth2Client.refreshAccessToken();
    const tokens = response.credentials;

    const refreshed: GmailCredential = {
      accessToken: tokens.access_token ?? credential.accessToken,
      refreshToken: tokens.refresh_token ?? credential.refreshToken,
      expiresAt: tokens.expiry_date ?? Date.now() + 3600 * 1000,
    };

    await this.userRepository.updateGmailCredential(recruiterId, refreshed);
    return refreshed;
  }
}
