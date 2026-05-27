import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CandidatePostulationPayload } from '@ats/shared-types';
import {
  CandidateRegistrationService,
  CandidateRegistrationConflictError,
  CandidateRegistrationServiceError,
} from '../candidateService';

const makePayload = (
  overrides: Partial<CandidatePostulationPayload> = {},
): CandidatePostulationPayload => ({
  jobId: 'job-1',
  firstName: 'Ana',
  lastName: 'García',
  email: 'ana@example.com',
  phone: '11223344',
  ...overrides,
});

const mockCandidatesRepo = {
  findByEmail: vi.fn(),
  createOrUpdateCandidate: vi.fn(),
  update: vi.fn(),
};

const mockAppRegistrationService = {
  createApplicationForCandidate: vi.fn(),
};

const mockAppRepo = {
  update: vi.fn(),
};

describe('CandidateRegistrationService.registerCandidate', () => {
  let service: CandidateRegistrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCandidatesRepo.findByEmail.mockResolvedValue(null);
    mockCandidatesRepo.createOrUpdateCandidate.mockResolvedValue(undefined);
    mockCandidatesRepo.update.mockResolvedValue(undefined);
    mockAppRegistrationService.createApplicationForCandidate.mockResolvedValue(
      'app-1',
    );

    service = new CandidateRegistrationService(
      mockCandidatesRepo as any,
      mockAppRegistrationService as any,
      mockAppRepo as any,
    );
  });

  it('crea el candidato y la postulación, retorna la respuesta correcta', async () => {
    const result = await service.registerCandidate('cand-1', makePayload());

    expect(mockCandidatesRepo.createOrUpdateCandidate).toHaveBeenCalledWith(
      'cand-1',
      expect.objectContaining({
        firstName: 'Ana',
        lastName: 'García',
        fullName: 'Ana García',
        email: 'ana@example.com',
        phone: '11223344',
        profileStatus: 'completed',
        registrationSource: 'manual',
        cvParseStatus: 'not_required',
      }),
    );
    expect(result).toEqual({
      candidateId: 'cand-1',
      applicationId: 'app-1',
      cvParseStatus: 'not_required',
      applicationStatus: 'active',
    });
  });

  it('llama a update con parsedCv cuando hay parsedExperience', async () => {
    await service.registerCandidate(
      'cand-1',
      makePayload({
        parsedExperience: [{ role: 'Dev', company: 'Acme', startDate: '2020' }],
      }),
    );

    expect(mockCandidatesRepo.update).toHaveBeenCalledWith('cand-1', {
      parsedCv: {
        experience: [{ role: 'Dev', company: 'Acme', startDate: '2020' }],
        education: [],
      },
    });
  });

  it('llama a update con parsedCv cuando hay parsedEducation', async () => {
    await service.registerCandidate(
      'cand-1',
      makePayload({
        parsedEducation: [{ degree: 'Lic.', institution: 'UBA' }],
      }),
    );

    expect(mockCandidatesRepo.update).toHaveBeenCalledWith('cand-1', {
      parsedCv: {
        experience: [],
        education: [{ degree: 'Lic.', institution: 'UBA' }],
      },
    });
  });

  it('NO llama a update cuando parsedExperience y parsedEducation están vacíos', async () => {
    await service.registerCandidate(
      'cand-1',
      makePayload({ parsedExperience: [], parsedEducation: [] }),
    );

    expect(mockCandidatesRepo.update).not.toHaveBeenCalled();
  });

  it('NO llama a update cuando parsedExperience y parsedEducation no están presentes', async () => {
    await service.registerCandidate('cand-1', makePayload());

    expect(mockCandidatesRepo.update).not.toHaveBeenCalled();
  });

  it('resuelve registrationType como specific cuando hay jobId', async () => {
    await service.registerCandidate('cand-1', makePayload({ jobId: 'job-1' }));

    expect(mockCandidatesRepo.createOrUpdateCandidate).toHaveBeenCalledWith(
      'cand-1',
      expect.objectContaining({ registrationType: 'specific' }),
    );
  });

  it('resuelve registrationType como general cuando jobId está vacío', async () => {
    await service.registerCandidate('cand-1', makePayload({ jobId: '' }));

    expect(mockCandidatesRepo.createOrUpdateCandidate).toHaveBeenCalledWith(
      'cand-1',
      expect.objectContaining({ registrationType: 'general' }),
    );
  });

  it('lanza CandidateRegistrationConflictError cuando el email ya existe con otro id', async () => {
    mockCandidatesRepo.findByEmail.mockResolvedValue({
      id: 'otro-cand',
      email: 'ana@example.com',
    });

    await expect(
      service.registerCandidate('cand-1', makePayload()),
    ).rejects.toThrow(CandidateRegistrationConflictError);
  });

  it('no lanza conflicto cuando el email existe con el mismo candidateId', async () => {
    mockCandidatesRepo.findByEmail.mockResolvedValue({
      id: 'cand-1',
      email: 'ana@example.com',
    });

    await expect(
      service.registerCandidate('cand-1', makePayload()),
    ).resolves.toBeDefined();
  });

  it('lanza CandidateRegistrationServiceError ante error inesperado del repositorio', async () => {
    mockCandidatesRepo.createOrUpdateCandidate.mockRejectedValue(
      new Error('Firestore error'),
    );

    await expect(
      service.registerCandidate('cand-1', makePayload()),
    ).rejects.toThrow(CandidateRegistrationServiceError);
  });

  it('propaga CandidateRegistrationConflictError sin envolver', async () => {
    mockCandidatesRepo.findByEmail.mockResolvedValue({
      id: 'otro',
      email: 'ana@example.com',
    });

    const error = await service
      .registerCandidate('cand-1', makePayload())
      .catch((e) => e);

    expect(error).toBeInstanceOf(CandidateRegistrationConflictError);
    expect(error).not.toBeInstanceOf(CandidateRegistrationServiceError);
  });
});
