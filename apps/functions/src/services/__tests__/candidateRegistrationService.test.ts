import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CandidatePostulationPayload } from '@ats/shared-types';

const firebaseAdminMocks = vi.hoisted(() => ({
  deleteFile: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('../../core/firebaseAdmin', () => ({
  auth: {
    getUser: firebaseAdminMocks.getUser,
  },
  storage: {
    bucket: vi.fn(() => ({
      file: vi.fn(() => ({
        delete: firebaseAdminMocks.deleteFile,
      })),
    })),
  },
}));

import {
  CandidateDraftDiscardNotAllowedError,
  CandidateProfileForConfirmationApplicationMismatchError,
  CandidateProfileForConfirmationApplicationNotFoundError,
  CandidateProfileForConfirmationNotFoundError,
  CandidateRegistrationCVService,
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
  createId: vi.fn(),
  findById: vi.fn(),
  findManyByEmail: vi.fn(),
  createOrUpdateCandidate: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockAppRegistrationService = {
  createApplicationForCandidate: vi.fn(),
};

const mockAppRepo = {
  findById: vi.fn(),
  findByCandidateAndJob: vi.fn(),
  update: vi.fn(),
  getStageHistory: vi.fn(),
  addStageHistoryEntry: vi.fn(),
  delete: vi.fn(),
};

describe('CandidateRegistrationService.registerCandidate', () => {
  let service: CandidateRegistrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCandidatesRepo.createId.mockReturnValue('cand-1');
    mockCandidatesRepo.findManyByEmail.mockResolvedValue([]);
    mockCandidatesRepo.createOrUpdateCandidate.mockResolvedValue(undefined);
    mockCandidatesRepo.update.mockResolvedValue(undefined);
    mockAppRegistrationService.createApplicationForCandidate.mockResolvedValue(
      'app-1',
    );
    mockAppRepo.findByCandidateAndJob.mockResolvedValue(null);

    service = new CandidateRegistrationService(
      mockCandidatesRepo as any,
      mockAppRegistrationService as any,
      mockAppRepo as any,
    );
  });

  it('crea el candidato y la postulación, retorna la respuesta correcta', async () => {
    const result = await service.registerCandidate('auth-uid', makePayload());

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

  it('normaliza los datos ingresados manualmente antes de persistirlos', async () => {
    await service.registerCandidate(
      'auth-uid',
      makePayload({
        firstName: ' Ana   María ',
        lastName: ' Pérez ',
        email: ' Ana.Perez @Example.COM ',
        phone: '(011) 2938-8293',
        location: ' Buenos   Aires ',
        yearsOfExperience: 61,
        education: ' Analista   de Sistemas ',
        technicalSkills: [' React ', 'react', '', ' TypeScript '],
        professionalSummary: ' Desarrolladora   frontend. ',
      }),
    );

    expect(mockCandidatesRepo.findManyByEmail).toHaveBeenCalledWith(
      'ana.perez@example.com',
    );
    expect(mockCandidatesRepo.createOrUpdateCandidate).toHaveBeenCalledWith(
      'cand-1',
      expect.objectContaining({
        firstName: 'Ana María',
        lastName: 'Pérez',
        fullName: 'Ana María Pérez',
        email: 'ana.perez@example.com',
        phone: '01129388293',
        location: 'Buenos Aires',
        yearsOfExperience: undefined,
        education: 'Analista de Sistemas',
        technicalSkills: ['React', 'TypeScript'],
        professionalSummary: 'Desarrolladora frontend.',
      }),
    );
  });

  it('genera un candidateId nuevo en lugar de usar el uid autenticado', async () => {
    mockCandidatesRepo.createId.mockReturnValue('cand-generated');

    const result = await service.registerCandidate('auth-uid', makePayload());

    expect(mockCandidatesRepo.createOrUpdateCandidate).toHaveBeenCalledWith(
      'cand-generated',
      expect.any(Object),
    );
    expect(
      mockAppRegistrationService.createApplicationForCandidate,
    ).toHaveBeenCalledWith('cand-generated', 'job-1', 'manual');
    expect(result.candidateId).toBe('cand-generated');
  });

  it('llama a update con parsedCv cuando hay parsedExperience', async () => {
    await service.registerCandidate(
      'auth-uid',
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
      'auth-uid',
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
      'auth-uid',
      makePayload({ parsedExperience: [], parsedEducation: [] }),
    );

    expect(mockCandidatesRepo.update).not.toHaveBeenCalled();
  });

  it('NO llama a update cuando parsedExperience y parsedEducation no están presentes', async () => {
    await service.registerCandidate('auth-uid', makePayload());

    expect(mockCandidatesRepo.update).not.toHaveBeenCalled();
  });

  it('resuelve registrationType como specific cuando hay jobId', async () => {
    await service.registerCandidate(
      'auth-uid',
      makePayload({ jobId: 'job-1' }),
    );

    expect(mockCandidatesRepo.createOrUpdateCandidate).toHaveBeenCalledWith(
      'cand-1',
      expect.objectContaining({ registrationType: 'specific' }),
    );
  });

  it('resuelve registrationType como general cuando jobId está vacío', async () => {
    await service.registerCandidate('auth-uid', makePayload({ jobId: '' }));

    expect(mockCandidatesRepo.createOrUpdateCandidate).toHaveBeenCalledWith(
      'cand-1',
      expect.objectContaining({ registrationType: 'general' }),
    );
  });

  it('permite usar el mismo email si no existe postulación para el mismo job', async () => {
    mockCandidatesRepo.findManyByEmail.mockResolvedValue([
      {
        id: 'existing-cand',
        email: 'ana@example.com',
      },
    ]);

    await expect(
      service.registerCandidate('auth-uid', makePayload({ jobId: 'job-2' })),
    ).resolves.toMatchObject({
      candidateId: 'cand-1',
      applicationId: 'app-1',
    });

    expect(mockAppRepo.findByCandidateAndJob).toHaveBeenCalledWith(
      'existing-cand',
      'job-2',
    );
  });

  it('lanza CandidateRegistrationConflictError cuando el email ya tiene postulación para el mismo job', async () => {
    mockCandidatesRepo.findManyByEmail.mockResolvedValue([
      {
        id: 'existing-cand',
        email: 'ana@example.com',
      },
    ]);
    mockAppRepo.findByCandidateAndJob.mockResolvedValue({
      id: 'existing-cand_job-1',
      candidateId: 'existing-cand',
      jobId: 'job-1',
    });

    await expect(
      service.registerCandidate('auth-uid', makePayload()),
    ).rejects.toThrow(CandidateRegistrationConflictError);
  });

  it('revisa todas las coincidencias de email antes de crear una nueva postulación', async () => {
    mockCandidatesRepo.findManyByEmail.mockResolvedValue([
      {
        id: 'existing-cand-1',
        email: 'ana@example.com',
      },
      {
        id: 'existing-cand-2',
        email: 'ana@example.com',
      },
    ]);
    mockAppRepo.findByCandidateAndJob
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'existing-cand-2_job-1',
        candidateId: 'existing-cand-2',
        jobId: 'job-1',
      });

    await expect(
      service.registerCandidate('auth-uid', makePayload()),
    ).rejects.toThrow(CandidateRegistrationConflictError);

    expect(mockAppRepo.findByCandidateAndJob).toHaveBeenCalledTimes(2);
    expect(mockCandidatesRepo.createOrUpdateCandidate).not.toHaveBeenCalled();
  });

  it('propaga CandidateRegistrationConflictError sin envolver', async () => {
    mockCandidatesRepo.findManyByEmail.mockResolvedValue([
      {
        id: 'otro',
        email: 'ana@example.com',
      },
    ]);
    mockAppRepo.findByCandidateAndJob.mockResolvedValue({
      id: 'otro_job-1',
      candidateId: 'otro',
      jobId: 'job-1',
    });

    const error = await service
      .registerCandidate('auth-uid', makePayload())
      .catch((e) => e);

    expect(error).toBeInstanceOf(CandidateRegistrationConflictError);
    expect(error).not.toBeInstanceOf(CandidateRegistrationServiceError);
  });

  it('no lanza conflicto cuando el email existe pero no tiene postulación para el job', async () => {
    mockCandidatesRepo.findManyByEmail.mockResolvedValue([
      {
        id: 'cand-1',
        email: 'ana@example.com',
      },
    ]);

    await expect(
      service.registerCandidate('auth-uid', makePayload()),
    ).resolves.toBeDefined();
  });

  it('lanza CandidateRegistrationServiceError ante error inesperado del repositorio', async () => {
    mockCandidatesRepo.createOrUpdateCandidate.mockRejectedValue(
      new Error('Firestore error'),
    );

    await expect(
      service.registerCandidate('auth-uid', makePayload()),
    ).rejects.toThrow(CandidateRegistrationServiceError);
  });
});

describe('CandidateRegistrationCVService.registerCandidateCV', () => {
  let service: CandidateRegistrationCVService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCandidatesRepo.createId.mockReturnValue('cand-cv-1');
    mockCandidatesRepo.createOrUpdateCandidate.mockResolvedValue(undefined);
    mockAppRegistrationService.createApplicationForCandidate.mockResolvedValue(
      'app-cv-1',
    );

    service = new CandidateRegistrationCVService(
      mockCandidatesRepo as any,
      mockAppRegistrationService as any,
    );
  });

  it('crea una postulación por CV usando un candidateId nuevo', async () => {
    const result = await service.registerCandidateCV('auth-uid', {
      jobId: 'job-1',
    });

    expect(mockCandidatesRepo.createOrUpdateCandidate).toHaveBeenCalledWith(
      'cand-cv-1',
      expect.objectContaining({
        profileStatus: 'draft',
        registrationSource: 'cv_upload',
        cvParseStatus: 'pending',
      }),
    );
    expect(
      mockAppRegistrationService.createApplicationForCandidate,
    ).toHaveBeenCalledWith('cand-cv-1', 'job-1', 'cv_upload');
    expect(result).toEqual({
      candidateId: 'cand-cv-1',
      applicationId: 'app-cv-1',
      uploadBasePath: 'cvs/cand-cv-1/',
      cvParseStatus: 'pending',
      applicationStatus: 'draft',
    });
  });
});

describe('CandidateRegistrationService.getCandidateProfileForConfirmation', () => {
  let service: CandidateRegistrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCandidatesRepo.findById.mockResolvedValue({
      id: 'cand-1',
      firstName: 'Ana',
      lastName: 'García',
      email: 'ana@example.com',
      phone: '11223344',
      location: 'Buenos Aires',
      yearsOfExperience: 3,
      education: 'Analista de Sistemas',
      technicalSkills: ['TypeScript', 'React'],
      professionalSummary: 'Frontend developer.',
      parsedCv: {
        experience: [{ role: 'Dev', company: 'Acme', startDate: '2020' }],
        education: [{ degree: 'Analista', institution: 'ORT' }],
      },
      profileStatus: 'draft',
      registrationType: 'specific',
      registrationSource: 'cv_upload',
      cvParseStatus: 'done',
      cvParseError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockAppRepo.findById.mockResolvedValue({
      id: 'app-1',
      candidateId: 'cand-1',
      jobId: 'job-1',
      stage: 'profile_pending',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      stageUpdatedAt: new Date(),
    });

    service = new CandidateRegistrationService(
      mockCandidatesRepo as any,
      mockAppRegistrationService as any,
      mockAppRepo as any,
    );
  });

  it('devuelve estado de parsing y profile preliminar para confirmación', async () => {
    const result = await service.getCandidateProfileForConfirmation({
      candidateId: 'cand-1',
      applicationId: 'app-1',
    });

    expect(mockCandidatesRepo.findById).toHaveBeenCalledWith('cand-1');
    expect(mockAppRepo.findById).toHaveBeenCalledWith('app-1');
    expect(result).toEqual({
      candidateId: 'cand-1',
      applicationId: 'app-1',
      cvParseStatus: 'done',
      cvParseError: null,
      profileStatus: 'draft',
      profile: {
        firstName: 'Ana',
        lastName: 'García',
        email: 'ana@example.com',
        phone: '11223344',
        location: 'Buenos Aires',
        yearsOfExperience: 3,
        education: 'Analista de Sistemas',
        technicalSkills: ['TypeScript', 'React'],
        professionalSummary: 'Frontend developer.',
        parsedExperience: [{ role: 'Dev', company: 'Acme', startDate: '2020' }],
        parsedEducation: [{ degree: 'Analista', institution: 'ORT' }],
      },
    });
  });

  it('devuelve cvParseError cuando el parsing falló', async () => {
    mockCandidatesRepo.findById.mockResolvedValue({
      id: 'cand-1',
      profileStatus: 'draft',
      registrationType: 'specific',
      registrationSource: 'cv_upload',
      cvParseStatus: 'failed',
      cvParseError: 'No se pudo parsear el CV.',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.getCandidateProfileForConfirmation({
      candidateId: 'cand-1',
      applicationId: 'app-1',
    });

    expect(result).toMatchObject({
      cvParseStatus: 'failed',
      cvParseError: 'No se pudo parsear el CV.',
      profileStatus: 'draft',
      profile: {},
    });
  });

  it('lanza error cuando el candidato no existe', async () => {
    mockCandidatesRepo.findById.mockResolvedValue(null);

    await expect(
      service.getCandidateProfileForConfirmation({
        candidateId: 'missing-candidate',
        applicationId: 'app-1',
      }),
    ).rejects.toThrow(CandidateProfileForConfirmationNotFoundError);
  });

  it('lanza error cuando la postulación no existe', async () => {
    mockAppRepo.findById.mockResolvedValue(null);

    await expect(
      service.getCandidateProfileForConfirmation({
        candidateId: 'cand-1',
        applicationId: 'missing-app',
      }),
    ).rejects.toThrow(CandidateProfileForConfirmationApplicationNotFoundError);
  });

  it('lanza error cuando la postulación no corresponde al candidato', async () => {
    mockAppRepo.findById.mockResolvedValue({
      id: 'app-1',
      candidateId: 'other-candidate',
      jobId: 'job-1',
      stage: 'profile_pending',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      stageUpdatedAt: new Date(),
    });

    await expect(
      service.getCandidateProfileForConfirmation({
        candidateId: 'cand-1',
        applicationId: 'app-1',
      }),
    ).rejects.toThrow(CandidateProfileForConfirmationApplicationMismatchError);
  });
});

describe('CandidateRegistrationService.confirmCandidateProfile', () => {
  let service: CandidateRegistrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCandidatesRepo.findById.mockResolvedValue({
      id: 'cand-1',
      firstName: 'Ana',
      lastName: 'Demo',
      fullName: 'Ana Demo',
      email: 'ana@example.com',
      profileStatus: 'draft',
      registrationType: 'specific',
      registrationSource: 'cv_upload',
      cvParseStatus: 'done',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockCandidatesRepo.update.mockResolvedValue(undefined);
    mockCandidatesRepo.findManyByEmail.mockResolvedValue([]);
    mockAppRepo.findById.mockResolvedValue({
      id: 'app-1',
      candidateId: 'cand-1',
      jobId: 'job-1',
      stage: 'profile_pending',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      stageUpdatedAt: new Date(),
    });
    mockAppRepo.update.mockResolvedValue(undefined);
    mockAppRepo.getStageHistory.mockResolvedValue([]);
    mockAppRepo.addStageHistoryEntry.mockResolvedValue(undefined);

    service = new CandidateRegistrationService(
      mockCandidatesRepo as any,
      mockAppRegistrationService as any,
      mockAppRepo as any,
    );
  });

  it('actualiza fullName con los datos confirmados por el candidato', async () => {
    await service.confirmCandidateProfile({
      candidateId: 'cand-1',
      applicationId: 'app-1',
      profile: {
        firstName: 'Ana',
        lastName: 'Loria',
        email: 'ana@example.com',
        phone: '11223344',
      },
    });

    expect(mockCandidatesRepo.update).toHaveBeenCalledWith(
      'cand-1',
      expect.objectContaining({
        firstName: 'Ana',
        lastName: 'Loria',
        fullName: 'Ana Loria',
        profileStatus: 'completed',
      }),
    );
    expect(mockAppRepo.update).toHaveBeenCalledWith(
      'app-1',
      expect.objectContaining({
        stage: 'applied',
        status: 'active',
        candidateName: 'Ana Loria',
        candidateEmail: 'ana@example.com',
      }),
    );
    expect(mockAppRepo.addStageHistoryEntry).toHaveBeenCalledWith('app-1', {
      stage: 'applied',
      changedBy: 'cand-1',
      changedByEmail: 'ana@example.com',
      notes: 'Perfil confirmado por el candidato.',
    });
  });

  it('normaliza los datos confirmados antes de persistirlos', async () => {
    await service.confirmCandidateProfile({
      candidateId: 'cand-1',
      applicationId: 'app-1',
      profile: {
        firstName: ' Ana ',
        lastName: ' Loria ',
        email: ' ANA@Example.COM ',
        phone: '+54 (11) 2233-4455',
        technicalSkills: [' React ', 'react', ' TypeScript '],
      },
    });

    expect(mockCandidatesRepo.findManyByEmail).toHaveBeenCalledWith(
      'ana@example.com',
    );
    expect(mockCandidatesRepo.update).toHaveBeenCalledWith(
      'cand-1',
      expect.objectContaining({
        firstName: 'Ana',
        lastName: 'Loria',
        fullName: 'Ana Loria',
        email: 'ana@example.com',
        phone: '541122334455',
        technicalSkills: ['React', 'TypeScript'],
      }),
    );
    expect(mockAppRepo.update).toHaveBeenCalledWith(
      'app-1',
      expect.objectContaining({
        candidateName: 'Ana Loria',
        candidateEmail: 'ana@example.com',
      }),
    );
  });

  it('bloquea la confirmación si el email ya tiene postulación para el mismo job', async () => {
    mockCandidatesRepo.findManyByEmail.mockResolvedValue([
      {
        id: 'existing-cand',
        email: 'ana@example.com',
      },
    ]);
    mockAppRepo.findByCandidateAndJob.mockResolvedValue({
      id: 'existing-cand_job-1',
      candidateId: 'existing-cand',
      jobId: 'job-1',
    });

    await expect(
      service.confirmCandidateProfile({
        candidateId: 'cand-1',
        applicationId: 'app-1',
        profile: {
          firstName: 'Ana',
          lastName: 'Loria',
          email: 'ana@example.com',
          phone: '11223344',
        },
      }),
    ).rejects.toThrow(CandidateRegistrationConflictError);

    expect(mockCandidatesRepo.update).not.toHaveBeenCalled();
    expect(mockAppRepo.update).not.toHaveBeenCalled();
  });

  it('permite confirmar si el mismo email existe pero para otro job', async () => {
    mockCandidatesRepo.findManyByEmail.mockResolvedValue([
      {
        id: 'existing-cand',
        email: 'ana@example.com',
      },
    ]);
    mockAppRepo.findByCandidateAndJob.mockResolvedValue(null);

    await expect(
      service.confirmCandidateProfile({
        candidateId: 'cand-1',
        applicationId: 'app-1',
        profile: {
          firstName: 'Ana',
          lastName: 'Loria',
          email: 'ana@example.com',
          phone: '11223344',
        },
      }),
    ).resolves.toMatchObject({
      candidateId: 'cand-1',
      applicationId: 'app-1',
      profileStatus: 'completed',
    });

    expect(mockAppRepo.findByCandidateAndJob).toHaveBeenCalledWith(
      'existing-cand',
      'job-1',
    );
  });
});

describe('CandidateRegistrationService.discardCandidateDraft', () => {
  let service: CandidateRegistrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    firebaseAdminMocks.deleteFile.mockResolvedValue(undefined);
    mockCandidatesRepo.findById.mockResolvedValue({
      id: 'cand-1',
      profileStatus: 'draft',
      registrationType: 'specific',
      registrationSource: 'cv_upload',
      cvParseStatus: 'done',
      cvStoragePath: 'cvs/cand-1/cv.pdf',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockAppRepo.findById.mockResolvedValue({
      id: 'app-1',
      candidateId: 'cand-1',
      jobId: 'job-1',
      stage: 'profile_pending',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      stageUpdatedAt: new Date(),
    });
    mockAppRepo.delete.mockResolvedValue(undefined);
    mockCandidatesRepo.delete.mockResolvedValue(undefined);

    service = new CandidateRegistrationService(
      mockCandidatesRepo as any,
      mockAppRegistrationService as any,
      mockAppRepo as any,
    );
  });

  it('elimina storage, application y candidate cuando el draft CV no fue confirmado', async () => {
    const result = await service.discardCandidateDraft({
      candidateId: 'cand-1',
      applicationId: 'app-1',
    });

    expect(firebaseAdminMocks.deleteFile).toHaveBeenCalledWith({
      ignoreNotFound: true,
    });
    expect(mockAppRepo.delete).toHaveBeenCalledWith('app-1');
    expect(mockCandidatesRepo.delete).toHaveBeenCalledWith('cand-1');
    expect(result).toEqual({
      candidateId: 'cand-1',
      applicationId: 'app-1',
      discarded: true,
    });
  });

  it('rechaza descartar una postulacion ya confirmada', async () => {
    mockCandidatesRepo.findById.mockResolvedValue({
      id: 'cand-1',
      profileStatus: 'completed',
      registrationType: 'specific',
      registrationSource: 'cv_upload',
      cvParseStatus: 'done',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockAppRepo.findById.mockResolvedValue({
      id: 'app-1',
      candidateId: 'cand-1',
      jobId: 'job-1',
      stage: 'applied',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      stageUpdatedAt: new Date(),
    });

    await expect(
      service.discardCandidateDraft({
        candidateId: 'cand-1',
        applicationId: 'app-1',
      }),
    ).rejects.toThrow(CandidateDraftDiscardNotAllowedError);

    expect(firebaseAdminMocks.deleteFile).not.toHaveBeenCalled();
    expect(mockAppRepo.delete).not.toHaveBeenCalled();
    expect(mockCandidatesRepo.delete).not.toHaveBeenCalled();
  });
});
