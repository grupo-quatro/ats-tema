import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  RegisterCandidatePayload,
  RegisterCandidateResponse,
  RegisterCandidateCVResponse,
} from '@ats/shared-types';

import {
  PostulationService,
  PostulationServiceError,
} from '../postulation/postulation.service';
import type { ICandidateRepository } from '../../repositories/interfaces/candidate.repository';

const mockRepo: ICandidateRepository = {
  registerCandidate: vi.fn(),
  registerCandidateCV: vi.fn(),
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

const cvResponse: RegisterCandidateCVResponse = {
  candidateId: 'cand-2',
  applicationId: 'app-2',
  uploadBasePath: 'cvs/cand-2/',
  cvParseStatus: 'pending',
  applicationStatus: 'draft',
};

const mockFile = new File(['content'], 'cv.pdf', { type: 'application/pdf' });

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

describe('PostulationService.registerCvFlow', () => {
  it('llama a registerCandidateCV con el jobId y retorna la respuesta', async () => {
    vi.mocked(mockRepo.registerCandidateCV).mockResolvedValue(cvResponse);
    vi.mocked(mockRepo.uploadCv).mockResolvedValue(undefined);

    const result = await service.registerCvFlow('job-123', mockFile);

    expect(mockRepo.registerCandidateCV).toHaveBeenCalledWith({
      jobId: 'job-123',
    });
    expect(result).toEqual(cvResponse);
  });

  it('sube el CV con el candidateId recibido en la respuesta', async () => {
    vi.mocked(mockRepo.registerCandidateCV).mockResolvedValue(cvResponse);
    vi.mocked(mockRepo.uploadCv).mockResolvedValue(undefined);

    await service.registerCvFlow('job-123', mockFile);

    expect(mockRepo.uploadCv).toHaveBeenCalledWith(
      cvResponse.candidateId,
      mockFile,
    );
  });

  it('siempre llama a uploadCv después de registerCandidateCV', async () => {
    vi.mocked(mockRepo.registerCandidateCV).mockResolvedValue(cvResponse);
    vi.mocked(mockRepo.uploadCv).mockResolvedValue(undefined);

    await service.registerCvFlow('job-123', mockFile);

    expect(mockRepo.registerCandidateCV).toHaveBeenCalledTimes(1);
    expect(mockRepo.uploadCv).toHaveBeenCalledTimes(1);
  });

  it('lanza PostulationServiceError si registerCandidateCV falla', async () => {
    vi.mocked(mockRepo.registerCandidateCV).mockRejectedValue(
      new Error('Firebase error'),
    );

    await expect(service.registerCvFlow('job-123', mockFile)).rejects.toThrow(
      PostulationServiceError,
    );
    await expect(service.registerCvFlow('job-123', mockFile)).rejects.toThrow(
      'No se pudo completar el registro con CV.',
    );
  });

  it('lanza PostulationServiceError si uploadCv falla', async () => {
    vi.mocked(mockRepo.registerCandidateCV).mockResolvedValue(cvResponse);
    vi.mocked(mockRepo.uploadCv).mockRejectedValue(new Error('Storage error'));

    await expect(service.registerCvFlow('job-123', mockFile)).rejects.toThrow(
      PostulationServiceError,
    );
  });

  it('no llama a uploadCv si registerCandidateCV falla', async () => {
    vi.mocked(mockRepo.registerCandidateCV).mockRejectedValue(
      new Error('Firebase error'),
    );

    await expect(service.registerCvFlow('job-123', mockFile)).rejects.toThrow();
    expect(mockRepo.uploadCv).not.toHaveBeenCalled();
  });
});
