import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  Application,
  Candidate,
  EmailLog,
  EmailTemplate,
  Job,
} from '@ats/shared-types';

vi.mock('firebase-functions', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { StageEmailService } from '../stageEmailService';
import type { IEmailLogRepository } from '../../repositories/emailLogRepository';
import type { IEmailTemplateRepository } from '../../repositories/emailTemplateRepository';
import type { IEmployeeRepository } from '../../repositories/employeeRepository';
import type { IOrgConfigRepository } from '../../repositories/orgConfigRepository';
import type { IUserRepository } from '../../repositories/userRepository';
import type { GmailSenderService } from '../gmailSenderService';
import type { TemplateResolverService } from '../templateResolverService';
import type { OAuth2Client } from 'google-auth-library';

// --- Fixtures ---

const makeApplication = (
  overrides: Partial<Application> = {},
): Application => ({
  id: 'app-1',
  jobId: 'job-1',
  candidateId: 'cand-1',
  stage: 'applied',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  stageUpdatedAt: new Date(),
  ...overrides,
});

const makeCandidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  id: 'cand-1',
  firstName: 'Ana',
  lastName: 'García',
  email: 'ana@example.com',
  profileStatus: 'completed',
  registrationType: 'specific',
  registrationSource: 'manual',
  cvParseStatus: 'not_required',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  title: 'Desarrollador Senior',
  department: 'Tecnología',
  seniority: 'Senior',
  location: 'remote',
  description: 'Descripción del puesto',
  skills: [],
  slug: 'desarrollador-senior',
  status: 'open',
  responsabilities: [],
  benefits: [],
  hiringManagerId: 'manager-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeTemplate = (
  overrides: Partial<EmailTemplate> = {},
): EmailTemplate => ({
  id: 'tmpl-1',
  name: 'Postulación recibida',
  stage: 'application_received',
  subject: 'Tu postulación fue recibida',
  body: '<p>Hola [Nombre del Candidato]</p>',
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// --- Mock factories ---

const makeEmailTemplateRepo = (): IEmailTemplateRepository => ({
  findByStage: vi.fn(),
});

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
  getCalendarWatchForUser: vi.fn(),
});

const makeOrgConfigRepo = (): IOrgConfigRepository => ({
  get: vi.fn(),
});

const makeTemplateResolver = (): TemplateResolverService =>
  ({
    resolve: vi.fn().mockReturnValue({
      subject: 'Tu postulación fue recibida',
      body: '<p>Hola Ana García</p>',
    }),
  }) as unknown as TemplateResolverService;

const makeGmailSender = (): GmailSenderService =>
  ({
    send: vi.fn(),
  }) as unknown as GmailSenderService;

const makeOAuth2Client = (): OAuth2Client =>
  ({
    setCredentials: vi.fn(),
    refreshAccessToken: vi.fn(),
  }) as unknown as OAuth2Client;

const makeEmployeeRepo = (): IEmployeeRepository => ({
  getCalendarLink: vi.fn().mockResolvedValue(null),
  setGmailStatus: vi.fn().mockResolvedValue(undefined),
  setCalendarStatus: vi.fn().mockResolvedValue(undefined),
});

// --- Helper para construir el servicio ---

const buildService = (
  templateRepo: IEmailTemplateRepository,
  logRepo: IEmailLogRepository,
  userRepo: IUserRepository,
  orgRepo: IOrgConfigRepository,
  resolver: TemplateResolverService,
  sender: GmailSenderService,
  oauth2: OAuth2Client,
  employeeRepo?: IEmployeeRepository,
) =>
  new StageEmailService(
    templateRepo,
    logRepo,
    userRepo,
    orgRepo,
    resolver,
    sender,
    oauth2,
    employeeRepo,
  );

// --- Tests ---

describe('StageEmailService.sendIfTemplateExists', () => {
  let templateRepo: IEmailTemplateRepository;
  let logRepo: IEmailLogRepository;
  let userRepo: IUserRepository;
  let orgRepo: IOrgConfigRepository;
  let resolver: TemplateResolverService;
  let sender: GmailSenderService;
  let oauth2: OAuth2Client;
  let service: StageEmailService;

  const application = makeApplication();
  const candidate = makeCandidate();
  const job = makeJob();
  const validCredential = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: Date.now() + 60 * 60 * 1000, // válido por 1 hora
  };

  beforeEach(() => {
    vi.clearAllMocks();
    templateRepo = makeEmailTemplateRepo();
    logRepo = makeEmailLogRepo();
    userRepo = makeUserRepo();
    orgRepo = makeOrgConfigRepo();
    resolver = makeTemplateResolver();
    sender = makeGmailSender();
    oauth2 = makeOAuth2Client();

    vi.mocked(orgRepo.get).mockResolvedValue({ companyName: 'ATS Corp' });
    vi.mocked(logRepo.create).mockResolvedValue('log-id-1');
    vi.mocked(logRepo.updateStatus).mockResolvedValue(undefined);

    service = buildService(
      templateRepo,
      logRepo,
      userRepo,
      orgRepo,
      resolver,
      sender,
      oauth2,
    );
  });

  it.each(['psychotechnical', 'pre_employment'] as const)(
    'no crea EmailLog ni llama al sender cuando el stage %s no tiene template configurado',
    async (stage) => {
      await service.sendIfTemplateExists(
        application,
        candidate,
        job,
        stage,
        'recruiter-1',
        'recruiter@example.com',
      );

      expect(templateRepo.findByStage).not.toHaveBeenCalled();
      expect(logRepo.create).not.toHaveBeenCalled();
      expect(sender.send).not.toHaveBeenCalled();
    },
  );

  it('no crea EmailLog cuando el stage tiene mapeo pero no hay template en Firestore', async () => {
    vi.mocked(templateRepo.findByStage).mockResolvedValue(null);

    // 'applied' mapea a 'application_received'
    await service.sendIfTemplateExists(
      application,
      candidate,
      job,
      'applied',
      'recruiter-1',
      'recruiter@example.com',
    );

    expect(templateRepo.findByStage).toHaveBeenCalledWith(
      'application_received',
    );
    expect(logRepo.create).not.toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalled();
  });

  it('no envía la plantilla offer cuando no se recibió el link público de la carta', async () => {
    await service.sendIfTemplateExists(
      application,
      candidate,
      job,
      'send_offer',
      'recruiter-1',
      'recruiter@example.com',
    );

    expect(templateRepo.findByStage).not.toHaveBeenCalled();
    expect(logRepo.create).not.toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalled();
  });

  it('pasa el link público de la carta al resolver para la plantilla offer', async () => {
    vi.mocked(templateRepo.findByStage).mockResolvedValue(
      makeTemplate({ stage: 'offer' }),
    );
    vi.mocked(userRepo.getGmailCredential).mockResolvedValue(validCredential);
    vi.mocked(sender.send).mockResolvedValue(undefined);

    await service.sendIfTemplateExists(
      application,
      candidate,
      job,
      'send_offer',
      'recruiter-1',
      'recruiter@example.com',
      'https://ats.example.com/offer/public-token',
      'offer-1',
    );

    expect(resolver.resolve).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        offerLink: 'https://ats.example.com/offer/public-token',
      }),
    );
    expect(logRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ offerId: 'offer-1', stage: 'send_offer' }),
    );
  });

  it('ejecuta el flujo completo con éxito: EmailLog pending → sent', async () => {
    vi.mocked(templateRepo.findByStage).mockResolvedValue(makeTemplate());
    vi.mocked(userRepo.getGmailCredential).mockResolvedValue(validCredential);
    vi.mocked(sender.send).mockResolvedValue(undefined);

    await service.sendIfTemplateExists(
      application,
      candidate,
      job,
      'applied',
      'recruiter-1',
      'recruiter@example.com',
    );

    expect(logRepo.create).toHaveBeenCalledOnce();
    const createdLog = vi.mocked(logRepo.create).mock.calls[0][0];
    expect(createdLog.status).toBe('pending');
    expect(createdLog.applicationId).toBe('app-1');
    expect(createdLog.candidateEmail).toBe('ana@example.com');

    expect(sender.send).toHaveBeenCalledOnce();
    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: validCredential.accessToken,
        to: 'ana@example.com',
      }),
    );
    expect(resolver.resolve).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ offerLink: '' }),
    );

    expect(logRepo.updateStatus).toHaveBeenCalledWith('log-id-1', {
      status: 'sent',
    });
  });

  it('envia email de entrevista presencial usando el texto fijo de la plantilla', async () => {
    vi.mocked(templateRepo.findByStage).mockResolvedValue(
      makeTemplate({
        stage: 'onsite_interview',
        subject: 'Entrevista presencial',
        body: '<p>Direccion: Av. Corrientes 1234</p>',
      }),
    );
    vi.mocked(userRepo.getGmailCredential).mockResolvedValue(validCredential);
    vi.mocked(sender.send).mockResolvedValue(undefined);

    await service.sendIfTemplateExists(
      application,
      candidate,
      job,
      'onsite_interview',
      'recruiter-1',
      'recruiter@example.com',
    );

    expect(templateRepo.findByStage).toHaveBeenCalledWith('onsite_interview');
    expect(resolver.resolve).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'onsite_interview' }),
      expect.objectContaining({ companyName: 'ATS Corp' }),
    );
    expect(logRepo.create).toHaveBeenCalledOnce();
    expect(sender.send).toHaveBeenCalledOnce();
  });

  it('marca EmailLog como failed con mensaje descriptivo cuando el recruiter no tiene Gmail conectado', async () => {
    vi.mocked(templateRepo.findByStage).mockResolvedValue(makeTemplate());
    vi.mocked(userRepo.getGmailCredential).mockResolvedValue(null);

    await service.sendIfTemplateExists(
      application,
      candidate,
      job,
      'applied',
      'recruiter-1',
      'recruiter@example.com',
    );

    expect(logRepo.create).toHaveBeenCalledOnce();
    expect(sender.send).not.toHaveBeenCalled();
    expect(logRepo.updateStatus).toHaveBeenCalledWith(
      'log-id-1',
      expect.objectContaining({
        status: 'failed',
        error: expect.stringContaining('Gmail'),
      }),
    );
  });

  it('marca EmailLog como failed cuando GmailSenderService.send lanza error, y no propaga la excepción', async () => {
    vi.mocked(templateRepo.findByStage).mockResolvedValue(makeTemplate());
    vi.mocked(userRepo.getGmailCredential).mockResolvedValue(validCredential);
    vi.mocked(sender.send).mockRejectedValue(new Error('Gmail API error: 500'));

    // No debe lanzar — retorna false porque el envío falló
    await expect(
      service.sendIfTemplateExists(
        application,
        candidate,
        job,
        'applied',
        'recruiter-1',
        'recruiter@example.com',
      ),
    ).resolves.toBe(false);

    expect(logRepo.create).toHaveBeenCalledOnce();
    expect(logRepo.updateStatus).toHaveBeenCalledWith(
      'log-id-1',
      expect.objectContaining({
        status: 'failed',
        error: 'Gmail API error: 500',
      }),
    );
  });

  it('pasa el calendarLink del recruiter al resolver de templates cuando está configurado', async () => {
    const employeeRepo = makeEmployeeRepo();
    vi.mocked(employeeRepo.getCalendarLink).mockResolvedValue(
      'https://calendar.google.com/calendar/appointments/schedules/test123',
    );
    vi.mocked(templateRepo.findByStage).mockResolvedValue(makeTemplate());
    vi.mocked(userRepo.getGmailCredential).mockResolvedValue(validCredential);
    vi.mocked(sender.send).mockResolvedValue(undefined);

    const serviceWithCalendar = buildService(
      templateRepo,
      logRepo,
      userRepo,
      orgRepo,
      resolver,
      sender,
      oauth2,
      employeeRepo,
    );

    await serviceWithCalendar.sendIfTemplateExists(
      application,
      candidate,
      job,
      'applied',
      'recruiter-1',
      'recruiter@example.com',
    );

    expect(employeeRepo.getCalendarLink).toHaveBeenCalledWith('recruiter-1');
    expect(resolver.resolve).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        calendarLink:
          'https://calendar.google.com/calendar/appointments/schedules/test123',
      }),
    );
  });

  it('usa calendarLink vacío cuando el recruiter no tiene link configurado', async () => {
    const employeeRepo = makeEmployeeRepo();
    vi.mocked(employeeRepo.getCalendarLink).mockResolvedValue(null);
    vi.mocked(templateRepo.findByStage).mockResolvedValue(makeTemplate());
    vi.mocked(userRepo.getGmailCredential).mockResolvedValue(validCredential);
    vi.mocked(sender.send).mockResolvedValue(undefined);

    const serviceWithCalendar = buildService(
      templateRepo,
      logRepo,
      userRepo,
      orgRepo,
      resolver,
      sender,
      oauth2,
      employeeRepo,
    );

    await serviceWithCalendar.sendIfTemplateExists(
      application,
      candidate,
      job,
      'applied',
      'recruiter-1',
      'recruiter@example.com',
    );

    expect(resolver.resolve).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ calendarLink: '' }),
    );
  });
});

describe('StageEmailService.previewIfTemplateExists', () => {
  let templateRepo: IEmailTemplateRepository;
  let logRepo: IEmailLogRepository;
  let userRepo: IUserRepository;
  let orgRepo: IOrgConfigRepository;
  let resolver: TemplateResolverService;
  let sender: GmailSenderService;
  let oauth2: OAuth2Client;
  let service: StageEmailService;

  const application = makeApplication();
  const candidate = makeCandidate();
  const job = makeJob();

  beforeEach(() => {
    vi.clearAllMocks();
    templateRepo = makeEmailTemplateRepo();
    logRepo = makeEmailLogRepo();
    userRepo = makeUserRepo();
    orgRepo = makeOrgConfigRepo();
    resolver = makeTemplateResolver();
    sender = makeGmailSender();
    oauth2 = makeOAuth2Client();

    vi.mocked(orgRepo.get).mockResolvedValue({ companyName: 'ATS Corp' });

    service = buildService(
      templateRepo,
      logRepo,
      userRepo,
      orgRepo,
      resolver,
      sender,
      oauth2,
    );
  });

  it('retorna hasEmail false cuando la etapa no tiene template configurado', async () => {
    const preview = await service.previewIfTemplateExists(
      application,
      candidate,
      job,
      'screening',
      'recruiter-1',
      'recruiter@example.com',
    );

    expect(preview).toEqual({
      stage: 'screening',
      candidateEmail: 'ana@example.com',
      hasEmail: false,
    });
    expect(templateRepo.findByStage).not.toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalled();
    expect(logRepo.create).not.toHaveBeenCalled();
  });

  it('resuelve la plantilla con datos reales para mostrar el preview', async () => {
    const template = makeTemplate({
      name: 'Postulacion recibida',
      stage: 'application_received',
      subject: 'Entrevista para [Nombre del Puesto]',
      body: '<p>Hola [Nombre del Candidato]</p>',
    });
    vi.mocked(templateRepo.findByStage).mockResolvedValue(template);
    vi.mocked(resolver.resolve).mockReturnValue({
      subject: 'Entrevista para Desarrollador Senior',
      body: '<p>Hola Ana Garcia</p>',
    });

    const preview = await service.previewIfTemplateExists(
      application,
      candidate,
      job,
      'applied',
      'recruiter-1',
      'recruiter@example.com',
    );

    expect(templateRepo.findByStage).toHaveBeenCalledWith(
      'application_received',
    );
    expect(resolver.resolve).toHaveBeenCalledWith(
      template,
      expect.objectContaining({
        candidateName: expect.stringContaining('Ana'),
        positionName: 'Desarrollador Senior',
        recruiterEmail: 'recruiter@example.com',
        companyName: 'ATS Corp',
      }),
    );
    expect(preview).toEqual({
      stage: 'applied',
      candidateEmail: 'ana@example.com',
      hasEmail: true,
      templateName: 'Postulacion recibida',
      subject: 'Entrevista para Desarrollador Senior',
      body: '<p>Hola Ana Garcia</p>',
    });
    expect(sender.send).not.toHaveBeenCalled();
    expect(logRepo.create).not.toHaveBeenCalled();
  });
});
