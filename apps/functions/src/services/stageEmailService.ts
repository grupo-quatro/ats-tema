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
import { APPLICATION_TO_EMAIL_STAGE_MAP } from '@ats/shared-types';

import type { IEmailLogRepository } from '../repositories/emailLogRepository';
import type { IEmailTemplateRepository } from '../repositories/emailTemplateRepository';
import type { IOrgConfigRepository } from '../repositories/orgConfigRepository';
import type { IUserRepository } from '../repositories/userRepository';
import type { GmailSenderService } from './gmailSenderService';
import type { ResolverContext, TemplateResolverService } from './templateResolverService';

export class StageEmailService {
  constructor(
    private readonly emailTemplateRepository: IEmailTemplateRepository,
    private readonly emailLogRepository: IEmailLogRepository,
    private readonly userRepository: IUserRepository,
    private readonly orgConfigRepository: IOrgConfigRepository,
    private readonly templateResolver: TemplateResolverService,
    private readonly gmailSender: GmailSenderService,
    private readonly oauth2Client: OAuth2Client,
  ) {}

  async sendIfTemplateExists(
    application: Application,
    candidate: Candidate,
    job: Job,
    newStage: ApplicationStage,
    recruiterId: string,
    recruiterEmail: string,
  ): Promise<void> {
    // El try externo captura fallos de setup (template lookup, orgConfig, etc.)
    // y garantiza que nunca se propague ningún error al caller.
    try {
      // 1. Mapear newStage → emailTemplateStage; si no hay mapeo, salir
      const emailTemplateStage = APPLICATION_TO_EMAIL_STAGE_MAP[newStage];
      if (emailTemplateStage === null || emailTemplateStage === undefined) {
        return;
      }

      // 2. Buscar template; si no existe, salir sin crear log
      const template = await this.emailTemplateRepository.findByStage(emailTemplateStage);
      if (!template) {
        return;
      }

      // 3. Obtener config de la organización y credencial del recruiter en paralelo
      const [orgConfig, credential] = await Promise.all([
        this.orgConfigRepository.get(),
        this.userRepository.getGmailCredential(recruiterId),
      ]);

      // 4. Construir contexto y resolver variables del template
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
        calendarLink: '',
        companyName: orgConfig.companyName,
      };

      const { subject, body } = this.templateResolver.resolve(template, context);

      // 5. Crear EmailLog con status='pending'
      const candidateEmail = candidate.email ?? '';
      const logDto: CreateEmailLogDTO = {
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

      // 6. Si el recruiter no tiene Gmail conectado, marcar log como failed y salir
      if (!credential) {
        await this.emailLogRepository.updateStatus(logId, {
          status: 'failed',
          error:
            'El reclutador no tiene una cuenta de Gmail conectada. ' +
            'Conecta tu cuenta en Configuración → Gmail.',
        });
        return;
      }

      // 7. Refrescar accessToken si está próximo a vencer
      let freshCredential: GmailCredential;
      try {
        freshCredential = await this.refreshIfNeeded(credential, recruiterId);
      } catch (refreshError) {
        logger.error('StageEmailService: no se pudo refrescar el token de Gmail', {
          recruiterId,
          error: refreshError,
        });
        await this.emailLogRepository.updateStatus(logId, {
          status: 'failed',
          error: 'No se pudo refrescar el token de acceso de Gmail.',
        });
        return;
      }

      // 8. Enviar email y actualizar log según resultado
      try {
        await this.gmailSender.send({
          accessToken: freshCredential.accessToken,
          to: candidateEmail,
          subject,
          htmlBody: body,
        });

        await this.emailLogRepository.updateStatus(logId, { status: 'sent' });
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
      }
    } catch (error) {
      logger.error('StageEmailService: error inesperado en sendIfTemplateExists', {
        stage: newStage,
        applicationId: application.id,
        error,
      });
      // No relanzar: el cambio de etapa ya fue persistido exitosamente
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
