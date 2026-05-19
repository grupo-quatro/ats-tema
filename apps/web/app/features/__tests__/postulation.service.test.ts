import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  RegisterCandidatePayload,
  RegisterCandidateResponse,
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
