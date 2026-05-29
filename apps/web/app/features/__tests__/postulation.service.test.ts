import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  GetCandidateProfileForConfirmationResponse,
  CandidatePostulationPayload as RegisterCandidatePayload,
  CandidatePostulationResponse as RegisterCandidateResponse,
} from '@ats/shared-types';

import {
  PostulationService,
  PostulationServiceError,
} from '../postulation/postulation.service';
import type { ICandidateRepository } from '../../repositories/interfaces/candidate.repository';

const mockRepo: ICandidateRepository = {
  registerCandidate: vi.fn(),
  registerCandidateCV: vi.fn(),
  getCandidateProfileForConfirmation: vi.fn(),
  confirmCandidateProfile: vi.fn(),
  uploadCv: vi.fn(),
};

const service = new PostulationService(mockRepo);

const payload: RegisterCandidatePayload = {
  jobId: 'job-123',
  firstName: 'Ana',
  lastName: 'García',
  email: 'ana@example.com',
  phone: '11223344',
};

const manualResponse: RegisterCandidateResponse = {
  candidateId: 'cand-1',
  applicationId: 'app-1',
  cvParseStatus: 'not_required',
  applicationStatus: 'active',
};

const mockFile = new File(['content'], 'cv.pdf', { type: 'application/pdf' });

const profileForConfirmationResponse: GetCandidateProfileForConfirmationResponse =
  {
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
      technicalSkills: ['TypeScript'],
    },
  };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('PostulationService.registerManual', () => {
  it('llama a registerCandidate con el payload y retorna la respuesta', async () => {
    vi.mocked(mockRepo.registerCandidate).mockResolvedValue(manualResponse);

    const result = await service.registerManual(payload);

    expect(mockRepo.registerCandidate).toHaveBeenCalledWith(payload);
    expect(result).toEqual(manualResponse);
  });

  it('no llama a uploadCv cuando no se pasa archivo', async () => {
    vi.mocked(mockRepo.registerCandidate).mockResolvedValue(manualResponse);

    await service.registerManual(payload);

    expect(mockRepo.uploadCv).not.toHaveBeenCalled();
  });

  it('sube el CV con el candidateId correcto cuando se pasa un archivo', async () => {
    vi.mocked(mockRepo.registerCandidate).mockResolvedValue(manualResponse);
    vi.mocked(mockRepo.uploadCv).mockResolvedValue(undefined);

    await service.registerManual(payload, mockFile);

    expect(mockRepo.uploadCv).toHaveBeenCalledWith(
      manualResponse.candidateId,
      mockFile,
    );
  });

  it('lanza PostulationServiceError si registerCandidate falla', async () => {
    vi.mocked(mockRepo.registerCandidate).mockRejectedValue(
      new Error('Firebase error'),
    );

    await expect(service.registerManual(payload)).rejects.toThrow(
      PostulationServiceError,
    );
    await expect(service.registerManual(payload)).rejects.toThrow(
      'No se pudo completar el registro manual.',
    );
  });

  it('lanza PostulationServiceError si uploadCv falla', async () => {
    vi.mocked(mockRepo.registerCandidate).mockResolvedValue(manualResponse);
    vi.mocked(mockRepo.uploadCv).mockRejectedValue(new Error('Storage error'));

    await expect(service.registerManual(payload, mockFile)).rejects.toThrow(
      PostulationServiceError,
    );
  });
});

describe('PostulationService.getCandidateProfileForConfirmation', () => {
  it('consulta el perfil para confirmación con candidateId y applicationId', async () => {
    vi.mocked(mockRepo.getCandidateProfileForConfirmation).mockResolvedValue(
      profileForConfirmationResponse,
    );

    const result = await service.getCandidateProfileForConfirmation(
      'cand-1',
      'app-1',
    );

    expect(mockRepo.getCandidateProfileForConfirmation).toHaveBeenCalledWith({
      candidateId: 'cand-1',
      applicationId: 'app-1',
    });
    expect(result).toEqual(profileForConfirmationResponse);
  });

  it('lanza PostulationServiceError si falla la consulta del perfil', async () => {
    vi.mocked(mockRepo.getCandidateProfileForConfirmation).mockRejectedValue(
      new Error('Functions error'),
    );

    await expect(
      service.getCandidateProfileForConfirmation('cand-1', 'app-1'),
    ).rejects.toThrow(PostulationServiceError);
    await expect(
      service.getCandidateProfileForConfirmation('cand-1', 'app-1'),
    ).rejects.toThrow('No se pudo obtener el perfil para confirmación.');
  });
});

describe('PostulationService.confirmCandidateProfile', () => {
  const confirmPayload = {
    candidateId: 'cand-1',
    applicationId: 'app-1',
    profile: {
      jobId: 'job-123',
      firstName: 'Ana',
      lastName: 'García',
      email: 'ana@example.com',
      phone: '11223344',
    },
  };

  it('confirma el perfil del candidato', async () => {
    vi.mocked(mockRepo.confirmCandidateProfile).mockResolvedValue({
      candidateId: 'cand-1',
      applicationId: 'app-1',
      profileStatus: 'completed',
      applicationStatus: 'active',
      applicationStage: 'applied',
      cvParseStatus: 'done',
    });

    const result = await service.confirmCandidateProfile(confirmPayload);

    expect(mockRepo.confirmCandidateProfile).toHaveBeenCalledWith(
      confirmPayload,
    );
    expect(result.profileStatus).toBe('completed');
  });

  it('usa mensaje fallback si falla la confirmación sin mensaje útil', async () => {
    vi.mocked(mockRepo.confirmCandidateProfile).mockRejectedValue({});

    await expect(
      service.confirmCandidateProfile(confirmPayload),
    ).rejects.toThrow(PostulationServiceError);
    await expect(
      service.confirmCandidateProfile(confirmPayload),
    ).rejects.toThrow('No se pudo confirmar el perfil del candidato.');
  });

  it('preserva el mensaje del backend cuando falla la confirmación', async () => {
    vi.mocked(mockRepo.confirmCandidateProfile).mockRejectedValue(
      new Error('Ya existe una postulación activa con el correo ingresado.'),
    );

    await expect(
      service.confirmCandidateProfile(confirmPayload),
    ).rejects.toThrow(
      'Ya existe una postulación activa con el correo ingresado.',
    );
  });
});
