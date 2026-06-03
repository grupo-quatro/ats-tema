import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Application } from '@ats/shared-types';
import {
  UpdateApplicationStageService,
  ApplicationNotFoundError,
  ApplicationStageTransitionError,
} from '../updateApplicationService';

vi.mock('../../core/firebaseAdmin', () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({ email: 'test@example.com' }),
  },
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

const mockRepo = {
  findById: vi.fn(),
  update: vi.fn(),
  findByJobId: vi.fn(),
  findByCandidateAndJob: vi.fn(),
  create: vi.fn(),
  addStageHistoryEntry: vi.fn(),
};

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
});
