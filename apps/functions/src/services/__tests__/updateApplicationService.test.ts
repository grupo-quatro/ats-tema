import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Application, Candidate, Job } from '@ats/shared-types';
import {
  UpdateApplicationStageService,
  ApplicationNotFoundError,
  ApplicationStageTransitionError,
} from '../updateApplicationService';
import type { StageEmailService } from '../stageEmailService';

vi.mock('../../core/firebaseAdmin', () => {
  const collectionProxy: Record<string, ReturnType<typeof vi.fn>> = {
    doc: vi.fn().mockReturnThis(),
    get: vi.fn(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    add: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
    collection: vi.fn().mockReturnThis(),
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ email: 'test@example.com' }),
    },
    db: {
      collection: vi.fn().mockReturnValue(collectionProxy),
    },
  };
});

vi.mock('firebase-functions', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

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

const mockRepo = {
  findById: vi.fn(),
  update: vi.fn(),
  findByJobId: vi.fn(),
  findByCandidateAndJob: vi.fn(),
  create: vi.fn(),
  addStageHistoryEntry: vi.fn(),
};

const mockCandidateRepo = {
  findById: vi.fn(),
};

const mockJobRepo = {
  findById: vi.fn(),
};

const mockStageEmailService: StageEmailService = {
  sendIfTemplateExists: vi.fn(),
} as unknown as StageEmailService;

describe('UpdateApplicationStageService.updateStage', () => {
  let service: UpdateApplicationStageService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.addStageHistoryEntry.mockResolvedValue(undefined);
    service = new UpdateApplicationStageService(mockRepo as any);
  });

  it('actualiza el stage y retorna { ok: true }', async () => {
    mockRepo.findById.mockResolvedValue(makeApplication());
    mockRepo.update.mockResolvedValue(undefined);

    const result = await service.updateStage(
      {
        applicationId: 'app-1',
        stage: 'screening',
      },
      'uid-test',
    );

    expect(result).toEqual({ ok: true });
    expect(mockRepo.update).toHaveBeenCalledWith('app-1', {
      stage: 'screening',
      status: 'active',
      recruiterId: 'uid-test',
    });
  });

  it('setea status hired cuando stage es hired', async () => {
    mockRepo.findById.mockResolvedValue(makeApplication());
    mockRepo.update.mockResolvedValue(undefined);

    await service.updateStage(
      { applicationId: 'app-1', stage: 'hired' },
      'uid-test',
    );

    expect(mockRepo.update).toHaveBeenCalledWith('app-1', {
      stage: 'hired',
      status: 'hired',
      recruiterId: 'uid-test',
    });
  });

  it('setea status rejected y persiste rejectionReason cuando stage es rejected', async () => {
    mockRepo.findById.mockResolvedValue(makeApplication());
    mockRepo.update.mockResolvedValue(undefined);

    await service.updateStage(
      {
        applicationId: 'app-1',
        stage: 'rejected',
        rejectionReason: 'No cumple los requisitos técnicos',
      },
      'uid-test',
    );

    expect(mockRepo.update).toHaveBeenCalledWith('app-1', {
      stage: 'rejected',
      status: 'rejected',
      rejectionReason: 'No cumple los requisitos técnicos',
      recruiterId: 'uid-test',
    });
  });

  it('setea status withdrawn cuando stage es withdrawn', async () => {
    mockRepo.findById.mockResolvedValue(makeApplication());
    mockRepo.update.mockResolvedValue(undefined);

    await service.updateStage(
      { applicationId: 'app-1', stage: 'withdrawn' },
      'uid-test',
    );

    expect(mockRepo.update).toHaveBeenCalledWith('app-1', {
      stage: 'withdrawn',
      status: 'withdrawn',
      recruiterId: 'uid-test',
    });
  });

  it('persiste notes cuando se proveen', async () => {
    mockRepo.findById.mockResolvedValue(makeApplication());
    mockRepo.update.mockResolvedValue(undefined);

    await service.updateStage(
      {
        applicationId: 'app-1',
        stage: 'cv_submitted',
        notes: 'Buen perfil técnico',
      },
      'uid-test',
    );

    expect(mockRepo.update).toHaveBeenCalledWith('app-1', {
      stage: 'cv_submitted',
      status: 'active',
      notes: 'Buen perfil técnico',
      recruiterId: 'uid-test',
    });
  });

  it('no incluye rejectionReason en el update cuando no se provee', async () => {
    mockRepo.findById.mockResolvedValue(makeApplication());
    mockRepo.update.mockResolvedValue(undefined);

    await service.updateStage(
      { applicationId: 'app-1', stage: 'screening' },
      'uid-test',
    );

    const updateCall = mockRepo.update.mock.calls[0][1];
    expect(updateCall).not.toHaveProperty('rejectionReason');
  });

  it('lanza ApplicationNotFoundError cuando la postulación no existe', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      service.updateStage(
        { applicationId: 'app-missing', stage: 'screening' },
        'uid-test',
      ),
    ).rejects.toThrow(ApplicationNotFoundError);

    await expect(
      service.updateStage(
        { applicationId: 'app-missing', stage: 'screening' },
        'uid-test',
      ),
    ).rejects.toThrow('app-missing');
  });

  it('bloquea cambios de etapa en postulaciones draft', async () => {
    mockRepo.findById.mockResolvedValue(
      makeApplication({ stage: 'profile_pending', status: 'draft' }),
    );

    await expect(
      service.updateStage(
        { applicationId: 'app-1', stage: 'screening' },
        'uid-test',
      ),
    ).rejects.toThrow(ApplicationStageTransitionError);

    expect(mockRepo.update).not.toHaveBeenCalled();
    expect(mockRepo.addStageHistoryEntry).not.toHaveBeenCalled();
  });

  it('bloquea avances desde estados finales sin reapertura', async () => {
    mockRepo.findById.mockResolvedValue(
      makeApplication({ stage: 'rejected', status: 'rejected' }),
    );

    await expect(
      service.updateStage(
        { applicationId: 'app-1', stage: 'screening' },
        'uid-test',
      ),
    ).rejects.toThrow(ApplicationStageTransitionError);

    expect(mockRepo.update).not.toHaveBeenCalled();
    expect(mockRepo.addStageHistoryEntry).not.toHaveBeenCalled();
  });

  it('propaga errores del repositorio en findById', async () => {
    mockRepo.findById.mockRejectedValue(new Error('Firestore error'));

    await expect(
      service.updateStage(
        { applicationId: 'app-1', stage: 'screening' },
        'uid-test',
      ),
    ).rejects.toThrow();
  });

  it('propaga errores del repositorio en update', async () => {
    mockRepo.findById.mockResolvedValue(makeApplication());
    mockRepo.update.mockRejectedValue(new Error('Firestore write error'));

    await expect(
      service.updateStage(
        { applicationId: 'app-1', stage: 'screening' },
        'uid-test',
      ),
    ).rejects.toThrow();
  });

  it('retorna { ok: true } y llama a stageEmailService.sendIfTemplateExists cuando el email se envía correctamente', async () => {
    mockRepo.findById.mockResolvedValue(makeApplication());
    mockRepo.update.mockResolvedValue(undefined);
    mockCandidateRepo.findById.mockResolvedValue(makeCandidate());
    mockJobRepo.findById.mockResolvedValue(makeJob());
    vi.mocked(mockStageEmailService.sendIfTemplateExists).mockResolvedValue(
      false,
    );

    const serviceWithEmail = new UpdateApplicationStageService(
      mockRepo as any,
      mockCandidateRepo as any,
      mockJobRepo as any,
      mockStageEmailService,
    );

    const result = await serviceWithEmail.updateStage(
      { applicationId: 'app-1', stage: 'screening' },
      'uid-test',
    );

    expect(result).toEqual({ ok: true });
    expect(mockStageEmailService.sendIfTemplateExists).toHaveBeenCalledOnce();
  });

  it('retorna { ok: true } aunque stageEmailService.sendIfTemplateExists falle internamente', async () => {
    mockRepo.findById.mockResolvedValue(makeApplication());
    mockRepo.update.mockResolvedValue(undefined);
    mockCandidateRepo.findById.mockResolvedValue(makeCandidate());
    mockJobRepo.findById.mockResolvedValue(makeJob());
    vi.mocked(mockStageEmailService.sendIfTemplateExists).mockRejectedValue(
      new Error('Error inesperado en el servicio de email'),
    );

    const serviceWithEmail = new UpdateApplicationStageService(
      mockRepo as any,
      mockCandidateRepo as any,
      mockJobRepo as any,
      mockStageEmailService,
    );

    const result = await serviceWithEmail.updateStage(
      { applicationId: 'app-1', stage: 'screening' },
      'uid-test',
    );

    expect(result).toEqual({ ok: true });
  });

  it('no dispara el email automático al cambiar manualmente a send_offer', async () => {
    mockRepo.findById.mockResolvedValue(makeApplication());
    mockRepo.update.mockResolvedValue(undefined);

    const serviceWithEmail = new UpdateApplicationStageService(
      mockRepo as any,
      mockCandidateRepo as any,
      mockJobRepo as any,
      mockStageEmailService,
    );

    await serviceWithEmail.updateStage(
      { applicationId: 'app-1', stage: 'send_offer' },
      'uid-test',
    );

    expect(mockStageEmailService.sendIfTemplateExists).not.toHaveBeenCalled();
    expect(mockCandidateRepo.findById).not.toHaveBeenCalled();
    expect(mockJobRepo.findById).not.toHaveBeenCalled();
  });
});
