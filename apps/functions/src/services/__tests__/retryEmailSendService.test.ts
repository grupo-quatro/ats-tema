import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EmailLog, GmailCredential } from '@ats/shared-types';

vi.mock('firebase-functions', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  RetryEmailSendService,
  EmailLogNotFoundError,
  OfferEmailRetryUnsupportedError,
} from '../retryEmailSendService';
import type { IEmailLogRepository } from '../../repositories/emailLogRepository';
import type { IUserRepository } from '../../repositories/userRepository';
import type { GmailSenderService } from '../gmailSenderService';
import type { OAuth2Client } from 'google-auth-library';

// --- Fixtures ---

const makeEmailLog = (overrides: Partial<EmailLog> = {}): EmailLog => ({
  id: 'log-1',
  applicationId: 'app-1',
  candidateId: 'cand-1',
  candidateEmail: 'candidato@example.com',
  jobId: 'job-1',
  templateId: 'tmpl-1',
  templateName: 'Postulación recibida',
  stage: 'applied',
  subject: 'Tu postulación fue recibida',
  body: '<p>Hola</p>',
  status: 'failed',
  error: 'Error anterior',
  recruiterId: 'recruiter-1',
  recruiterEmail: 'recruiter@example.com',
  attemptedAt: new Date('2024-01-01T10:00:00Z'),
  ...overrides,
});

const makeValidCredential = (): GmailCredential => ({
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: Date.now() + 60 * 60 * 1000, // válido por 1 hora
});

// --- Mock factories ---

const makeEmailLogRepo = (): IEmailLogRepository => ({
  create: vi.fn(),
  updateStatus: vi.fn(),
  findById: vi.fn(),
  findByCandidate: vi.fn(),
  findFailed: vi.fn(),
  findFailedByApplication: vi.fn(),
});

const makeUserRepo = (): IUserRepository => ({
  getGmailCredential: vi.fn(),
  updateGmailCredential: vi.fn(),
  getCalendarCredential: vi.fn(),
  updateCalendarCredential: vi.fn(),
  saveCalendarWatch: vi.fn(),
  getCalendarWatchByChannelId: vi.fn(),
});

const makeGmailSender = (): GmailSenderService =>
  ({
    send: vi.fn(),
  }) as unknown as GmailSenderService;

const makeOAuth2Client = (): OAuth2Client =>
  ({
    setCredentials: vi.fn(),
    refreshAccessToken: vi.fn(),
  }) as unknown as OAuth2Client;

// --- Tests ---

describe('RetryEmailSendService.retry', () => {
  let emailLogRepo: IEmailLogRepository;
  let userRepo: IUserRepository;
  let gmailSender: GmailSenderService;
  let oauth2: OAuth2Client;
  let service: RetryEmailSendService;

  beforeEach(() => {
    vi.clearAllMocks();
    emailLogRepo = makeEmailLogRepo();
    userRepo = makeUserRepo();
    gmailSender = makeGmailSender();
    oauth2 = makeOAuth2Client();
    service = new RetryEmailSendService(
      emailLogRepo,
      userRepo,
      gmailSender,
      oauth2,
    );
  });

  it('lanza EmailLogNotFoundError cuando el log no existe', async () => {
    vi.mocked(emailLogRepo.findById).mockResolvedValue(null);

    await expect(
      service.retry('log-inexistente', 'recruiter-1'),
    ).rejects.toThrow(EmailLogNotFoundError);
    expect(emailLogRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('bloquea el reintento genérico de emails asociados a una oferta', async () => {
    vi.mocked(emailLogRepo.findById).mockResolvedValue(
      makeEmailLog({ offerId: 'offer-1', stage: 'send_offer' }),
    );

    await expect(service.retry('log-1', 'recruiter-1')).rejects.toThrow(
      OfferEmailRetryUnsupportedError,
    );

    expect(emailLogRepo.updateStatus).not.toHaveBeenCalled();
    expect(gmailSender.send).not.toHaveBeenCalled();
  });

  it('marca el log como failed y lanza error cuando el usuario no tiene Gmail conectado', async () => {
    vi.mocked(emailLogRepo.findById).mockResolvedValue(makeEmailLog());
    vi.mocked(emailLogRepo.updateStatus).mockResolvedValue(undefined);
    vi.mocked(userRepo.getGmailCredential).mockResolvedValue(null);

    await expect(service.retry('log-1', 'recruiter-sin-gmail')).rejects.toThrow(
      /Gmail/,
    );

    // Primero pone pending, luego failed
    expect(emailLogRepo.updateStatus).toHaveBeenCalledWith('log-1', {
      status: 'pending',
    });
    expect(emailLogRepo.updateStatus).toHaveBeenCalledWith(
      'log-1',
      expect.objectContaining({
        status: 'failed',
        error: expect.stringContaining('Gmail'),
      }),
    );
    expect(gmailSender.send).not.toHaveBeenCalled();
  });

  it('reintento exitoso: actualiza a pending, envía y actualiza a sent', async () => {
    const log = makeEmailLog();
    vi.mocked(emailLogRepo.findById).mockResolvedValue(log);
    vi.mocked(emailLogRepo.updateStatus).mockResolvedValue(undefined);
    vi.mocked(userRepo.getGmailCredential).mockResolvedValue(
      makeValidCredential(),
    );
    vi.mocked(gmailSender.send).mockResolvedValue(undefined);

    await service.retry('log-1', 'recruiter-1');

    expect(emailLogRepo.updateStatus).toHaveBeenCalledWith('log-1', {
      status: 'pending',
    });
    expect(gmailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: log.candidateEmail,
        subject: log.subject,
        htmlBody: log.body,
      }),
    );
    expect(emailLogRepo.updateStatus).toHaveBeenCalledWith('log-1', {
      status: 'sent',
    });
  });

  it('marca el log como failed y propaga el error cuando GmailSenderService.send falla', async () => {
    vi.mocked(emailLogRepo.findById).mockResolvedValue(makeEmailLog());
    vi.mocked(emailLogRepo.updateStatus).mockResolvedValue(undefined);
    vi.mocked(userRepo.getGmailCredential).mockResolvedValue(
      makeValidCredential(),
    );
    vi.mocked(gmailSender.send).mockRejectedValue(new Error('Gmail API 500'));

    await expect(service.retry('log-1', 'recruiter-1')).rejects.toThrow(
      'Gmail API 500',
    );

    expect(emailLogRepo.updateStatus).toHaveBeenCalledWith(
      'log-1',
      expect.objectContaining({
        status: 'failed',
        error: 'Gmail API 500',
      }),
    );
  });
});
