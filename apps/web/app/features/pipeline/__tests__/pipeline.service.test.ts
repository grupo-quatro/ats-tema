import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApplicationWithCandidateDTO } from '@ats/shared-types';
import { PipelineService, PipelineServiceError } from '../pipeline.service';
import type { IApplicationRepository } from '../../../repositories/interfaces/application.repository';

const makeApplication = (
  overrides: Partial<ApplicationWithCandidateDTO> = {},
): ApplicationWithCandidateDTO => ({
  id: 'app-1',
  jobId: 'job-1',
  candidateId: 'cand-1',
  candidateName: 'Ana García',
  candidateEmail: 'ana@example.com',
  stage: 'applied',
  status: 'active',
  fitScore: 90,
  createdAt: new Date(),
  updatedAt: new Date(),
  stageUpdatedAt: new Date(),
  ...overrides,
});

const mockRepo: IApplicationRepository = {
  getApplicationsByJob: vi.fn(),
  updateApplicationStage: vi.fn(),
};

describe('PipelineService.getCandidatesByJob', () => {
  let service: PipelineService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new PipelineService(mockRepo);
  });

  it('retorna la lista de candidatos del repositorio', async () => {
    const candidates = [
      makeApplication(),
      makeApplication({ id: 'app-2', fitScore: 75 }),
    ];
    vi.mocked(mockRepo.getApplicationsByJob).mockResolvedValue(candidates);

    const result = await service.getCandidatesByJob('job-1');

    expect(result).toEqual(candidates);
  });

  it('consulta por fecha para incluir postulaciones sin fitScore', async () => {
    vi.mocked(mockRepo.getApplicationsByJob).mockResolvedValue([]);

    await service.getCandidatesByJob('job-1');

    expect(mockRepo.getApplicationsByJob).toHaveBeenCalledWith({
      jobId: 'job-1',
      orderBy: 'createdAt',
      orderDirection: 'desc',
      limit: undefined,
    });
  });

  it('respeta las opciones de query cuando se proveen', async () => {
    vi.mocked(mockRepo.getApplicationsByJob).mockResolvedValue([]);

    await service.getCandidatesByJob('job-1', {
      orderBy: 'createdAt',
      orderDirection: 'asc',
      limit: 10,
    });

    expect(mockRepo.getApplicationsByJob).toHaveBeenCalledWith({
      jobId: 'job-1',
      orderBy: 'createdAt',
      orderDirection: 'asc',
      limit: 10,
    });
  });

  it('lanza PipelineServiceError cuando el repositorio falla', async () => {
    vi.mocked(mockRepo.getApplicationsByJob).mockRejectedValue(
      new Error('Firebase error'),
    );

    await expect(service.getCandidatesByJob('job-1')).rejects.toThrow(
      PipelineServiceError,
    );
    await expect(service.getCandidatesByJob('job-1')).rejects.toThrow(
      'No se pudieron obtener los candidatos',
    );
  });
});

describe('PipelineService.updateApplicationStage', () => {
  let service: PipelineService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new PipelineService(mockRepo);
  });

  it('retorna { ok: true } cuando el repositorio resuelve', async () => {
    vi.mocked(mockRepo.updateApplicationStage).mockResolvedValue({ ok: true });

    const result = await service.updateApplicationStage('app-1', 'screening');

    expect(result).toEqual({ ok: true });
  });

  it('llama al repositorio con applicationId y stage correctos', async () => {
    vi.mocked(mockRepo.updateApplicationStage).mockResolvedValue({ ok: true });

    await service.updateApplicationStage(
      'app-1',
      'cv_submitted',
      'Buen perfil',
    );

    expect(mockRepo.updateApplicationStage).toHaveBeenCalledWith({
      applicationId: 'app-1',
      stage: 'cv_submitted',
      notes: 'Buen perfil',
    });
  });

  it('no incluye notes en el payload cuando no se proveen', async () => {
    vi.mocked(mockRepo.updateApplicationStage).mockResolvedValue({ ok: true });

    await service.updateApplicationStage('app-1', 'screening');

    const call = vi.mocked(mockRepo.updateApplicationStage).mock.calls[0]?.[0];
    expect(call).not.toHaveProperty('notes');
  });

  it('lanza PipelineServiceError cuando el repositorio falla', async () => {
    vi.mocked(mockRepo.updateApplicationStage).mockRejectedValue(
      new Error('Firebase error'),
    );

    await expect(
      service.updateApplicationStage('app-1', 'screening'),
    ).rejects.toThrow(PipelineServiceError);
  });
});

describe('PipelineService.discardApplication', () => {
  let service: PipelineService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new PipelineService(mockRepo);
  });

  it('llama al repositorio con stage rejected y el motivo de rechazo', async () => {
    vi.mocked(mockRepo.updateApplicationStage).mockResolvedValue({ ok: true });

    await service.discardApplication('app-1', 'No cumple los requisitos');

    expect(mockRepo.updateApplicationStage).toHaveBeenCalledWith({
      applicationId: 'app-1',
      stage: 'rejected',
      rejectionReason: 'No cumple los requisitos',
    });
  });

  it('retorna { ok: true } cuando el repositorio resuelve', async () => {
    vi.mocked(mockRepo.updateApplicationStage).mockResolvedValue({ ok: true });

    const result = await service.discardApplication('app-1', 'Motivo');

    expect(result).toEqual({ ok: true });
  });

  it('lanza PipelineServiceError cuando el repositorio falla', async () => {
    vi.mocked(mockRepo.updateApplicationStage).mockRejectedValue(
      new Error('Firebase error'),
    );

    await expect(service.discardApplication('app-1', 'Motivo')).rejects.toThrow(
      PipelineServiceError,
    );
    await expect(service.discardApplication('app-1', 'Motivo')).rejects.toThrow(
      'No se pudo descartar',
    );
  });
});
