import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Application, Candidate, Job } from '@ats/shared-types';

vi.mock('../../core/firebaseAdmin', () => ({
  db: {
    collection: vi.fn(),
  },
}));

import { SkillMatchService } from '../skillMatchService';

const makeApplication = (
  overrides: Partial<Application> = {},
): Application => ({
  id: 'application-1',
  candidateId: 'candidate-1',
  jobId: 'job-1',
  stage: 'applied',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  stageUpdatedAt: new Date(),
  ...overrides,
});

const makeCandidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  id: 'candidate-1',
  profileStatus: 'completed',
  registrationType: 'specific',
  registrationSource: 'manual',
  cvParseStatus: 'not_required',
  technicalSkills: ['React'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  title: 'Frontend Developer',
  department: 'Engineering',
  seniority: 'senior',
  location: 'remote',
  description: 'Frontend role',
  skills: [
    {
      name: 'React',
      weight: 3,
      type: 'mandatory',
    },
    {
      name: 'TypeScript',
      weight: 1,
      type: 'desirable',
    },
  ],
  slug: 'frontend-developer',
  status: 'open',
  responsabilities: [],
  benefits: [],
  hiringManagerId: 'manager-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createApplicationsRepositoryMock = () => ({
  findById: vi.fn(),
  findByCandidateId: vi.fn(),
  findByJobId: vi.fn(),
  updateSkillMatch: vi.fn(),
});

const createCandidatesRepositoryMock = () => ({
  findById: vi.fn(),
});

const createJobsRepositoryMock = () => ({
  findById: vi.fn(),
});

describe('SkillMatchService', () => {
  let applicationsRepository: ReturnType<
    typeof createApplicationsRepositoryMock
  >;
  let candidatesRepository: ReturnType<typeof createCandidatesRepositoryMock>;
  let jobsRepository: ReturnType<typeof createJobsRepositoryMock>;
  let service: SkillMatchService;

  beforeEach(() => {
    vi.clearAllMocks();
    applicationsRepository = createApplicationsRepositoryMock();
    candidatesRepository = createCandidatesRepositoryMock();
    jobsRepository = createJobsRepositoryMock();
    service = new SkillMatchService(
      applicationsRepository as any,
      candidatesRepository as any,
      jobsRepository as any,
    );

    applicationsRepository.findById.mockResolvedValue(makeApplication());
    candidatesRepository.findById.mockResolvedValue(makeCandidate());
    jobsRepository.findById.mockResolvedValue(makeJob());
  });

  it('calcula y persiste el score cuando el perfil está completo', async () => {
    await service.calculateAndPersist('application-1');

    expect(applicationsRepository.updateSkillMatch).toHaveBeenCalledWith(
      'application-1',
      expect.objectContaining({
        scoreTotal: 75,
        scoreMandatory: 100,
        scoreDesirable: 0,
        tieneTodosLosMandatorios: true,
      }),
    );
  });

  it('elimina el score mientras el perfil del candidato sigue draft', async () => {
    candidatesRepository.findById.mockResolvedValue(
      makeCandidate({ profileStatus: 'draft' }),
    );

    await service.calculateAndPersist('application-1');

    expect(applicationsRepository.updateSkillMatch).toHaveBeenCalledWith(
      'application-1',
      null,
    );
  });

  it('elimina el score cuando la posición no tiene criterios de skills', async () => {
    jobsRepository.findById.mockResolvedValue(makeJob({ skills: [] }));

    await service.calculateAndPersist('application-1');

    expect(applicationsRepository.updateSkillMatch).toHaveBeenCalledWith(
      'application-1',
      null,
    );
  });

  it('persiste 0 cuando el perfil está completo pero no hay coincidencias', async () => {
    candidatesRepository.findById.mockResolvedValue(
      makeCandidate({ technicalSkills: [] }),
    );

    await service.calculateAndPersist('application-1');

    expect(applicationsRepository.updateSkillMatch).toHaveBeenCalledWith(
      'application-1',
      expect.objectContaining({ scoreTotal: 0 }),
    );
  });

  it('recalcula todas las postulaciones asociadas a un candidato', async () => {
    applicationsRepository.findByCandidateId.mockResolvedValue([
      makeApplication({ id: 'application-1' }),
      makeApplication({ id: 'application-2', jobId: 'job-2' }),
    ]);
    applicationsRepository.findById.mockImplementation(async (id: string) =>
      makeApplication({ id }),
    );

    await service.recalculateForCandidate('candidate-1');

    expect(applicationsRepository.findByCandidateId).toHaveBeenCalledWith(
      'candidate-1',
    );
    expect(applicationsRepository.updateSkillMatch).toHaveBeenCalledTimes(2);
  });

  it('recalcula todas las postulaciones asociadas a una posición', async () => {
    applicationsRepository.findByJobId.mockResolvedValue([
      makeApplication({ id: 'application-1' }),
      makeApplication({ id: 'application-2', candidateId: 'candidate-2' }),
    ]);
    applicationsRepository.findById.mockImplementation(async (id: string) =>
      makeApplication({ id }),
    );

    await service.recalculateForJob('job-1');

    expect(applicationsRepository.findByJobId).toHaveBeenCalledWith('job-1');
    expect(applicationsRepository.updateSkillMatch).toHaveBeenCalledTimes(2);
  });
});
