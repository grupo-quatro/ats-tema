import type {
  CandidatePostulationPayload,
  CandidatePostulationResponse,
  CandidatePostulationCVResponse,
} from '@ats/shared-types';
import type { ICandidateRepository } from '../../repositories/interfaces/candidate.repository';

export class PostulationServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PostulationServiceError';
  }
}

export class PostulationService {
  constructor(private readonly repo: ICandidateRepository) {}

  async registerManual(
    payload: CandidatePostulationPayload,
    file?: File,
  ): Promise<CandidatePostulationResponse> {
    try {
      const response = await this.repo.registerCandidate(payload);
      if (file) await this.repo.uploadCv(response.candidateId, file);
      return response;
    } catch (error) {
      throw new PostulationServiceError(
        'No se pudo completar el registro manual.',
        error,
      );
    }
  }

  async registerCvFlow(
    jobId: string,
    file: File,
  ): Promise<CandidatePostulationCVResponse> {
    try {
      const response = await this.repo.registerCandidateCV({ jobId });
      await this.repo.uploadCv(response.candidateId, file);
      return response;
    } catch (error) {
      throw new PostulationServiceError(
        'No se pudo completar el registro con CV.',
        error,
      );
    }
  }
}
