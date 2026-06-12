import type { OAuth2Client } from 'google-auth-library';

import { GMAIL_STATUS } from '@ats/shared-types';
import type { GmailCredential } from '@ats/shared-types';

import type { IEmailLogRepository } from '../repositories/emailLogRepository';
import type { IEmployeeRepository } from '../repositories/employeeRepository';
import type { IUserRepository } from '../repositories/userRepository';
import type { GmailSenderService } from './gmailSenderService';

export class EmailLogNotFoundError extends Error {
  constructor(logId: string) {
    super(`No se encontró el registro de email con id ${logId}.`);
    this.name = 'EmailLogNotFoundError';
  }
}

export class OfferEmailRetryUnsupportedError extends Error {
  constructor() {
    super(
      'Los emails de carta oferta deben reenviarse desde la gestión de la oferta.',
    );
    this.name = 'OfferEmailRetryUnsupportedError';
  }
}

export class RetryEmailSendService {
  constructor(
    private readonly emailLogRepository: IEmailLogRepository,
    private readonly userRepository: IUserRepository,
    private readonly gmailSender: GmailSenderService,
    private readonly oauth2Client: OAuth2Client,
    private readonly employeeRepository?: IEmployeeRepository,
  ) {}

  async retry(logId: string, retryingUserId: string): Promise<void> {
    // 1. Cargar EmailLog; si no existe, lanzar error
    const log = await this.emailLogRepository.findById(logId);
    if (!log) {
      throw new EmailLogNotFoundError(logId);
    }
    if (log.offerId) {
      throw new OfferEmailRetryUnsupportedError();
    }

    // 2. Actualizar a status='pending'
    await this.emailLogRepository.updateStatus(logId, { status: 'pending' });

    // 3. Obtener credencial de Gmail del usuario que está reintentando
    const credential =
      await this.userRepository.getGmailCredential(retryingUserId);

    // 4. Sin credencial → marcar como failed y lanzar error descriptivo
    if (!credential) {
      await this.emailLogRepository.updateStatus(logId, {
        status: 'failed',
        error:
          'El reclutador no tiene una cuenta de Gmail conectada. ' +
          'Conecta tu cuenta en Configuración → Gmail.',
      });
      throw new Error('El reclutador no tiene una cuenta de Gmail conectada.');
    }

    // 5. Refrescar token si está próximo a vencer
    let freshCredential: GmailCredential;
    try {
      freshCredential = await this.refreshIfNeeded(credential, retryingUserId);
    } catch (refreshError) {
      const isRevoked =
        refreshError instanceof Error &&
        refreshError.message.includes('invalid_grant');

      if (isRevoked) {
        await this.employeeRepository?.setGmailStatus(
          retryingUserId,
          GMAIL_STATUS.DISCONNECTED,
        );
      }

      await this.emailLogRepository.updateStatus(logId, {
        status: 'failed',
        error: isRevoked
          ? 'TOKEN_REVOKED: el acceso a Gmail fue revocado. El recruiter debe reconectar su cuenta.'
          : 'No se pudo refrescar el token de acceso de Gmail.',
      });
      throw refreshError;
    }

    // 6. Enviar email
    try {
      await this.gmailSender.send({
        accessToken: freshCredential.accessToken,
        to: log.candidateEmail,
        subject: log.subject,
        htmlBody: log.body,
      });

      // 7. Actualizar log a status='sent'
      await this.emailLogRepository.updateStatus(logId, { status: 'sent' });
    } catch (sendError) {
      const errorMessage =
        sendError instanceof Error
          ? sendError.message
          : 'Error desconocido al enviar el email.';

      await this.emailLogRepository.updateStatus(logId, {
        status: 'failed',
        error: errorMessage,
      });
      throw sendError;
    }
  }

  private async refreshIfNeeded(
    credential: GmailCredential,
    userId: string,
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

    await this.userRepository.updateGmailCredential(userId, refreshed);
    return refreshed;
  }
}
