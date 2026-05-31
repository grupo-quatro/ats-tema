import type {
  CandidatePostulationPayload,
  CandidatePostulationResponse,
  CandidatePostulationCVResponse,
  ConfirmCandidateProfilePayload,
  ConfirmCandidateProfileResponse,
  DiscardCandidateDraftPayload,
  DiscardCandidateDraftResponse,
  GetCandidateProfileForConfirmationResponse,
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

function resolveErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
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

  async getCandidateProfileForConfirmation(
    candidateId: string,
    applicationId: string,
  ): Promise<GetCandidateProfileForConfirmationResponse> {
    try {
      return await this.repo.getCandidateProfileForConfirmation({
        candidateId,
        applicationId,
      });
    } catch (error) {
      throw new PostulationServiceError(
        'No se pudo obtener el perfil para confirmación.',
        error,
      );
    }
  }

  async confirmCandidateProfile(
    payload: ConfirmCandidateProfilePayload,
  ): Promise<ConfirmCandidateProfileResponse> {
    try {
      return await this.repo.confirmCandidateProfile(payload);
    } catch (error) {
      throw new PostulationServiceError(
        resolveErrorMessage(
          error,
          'No se pudo confirmar el perfil del candidato.',
        ),
        error,
      );
    }
  }

  async discardCandidateDraft(
    payload: DiscardCandidateDraftPayload,
  ): Promise<DiscardCandidateDraftResponse> {
    try {
      return await this.repo.discardCandidateDraft(payload);
    } catch (error) {
      throw new PostulationServiceError(
        resolveErrorMessage(
          error,
          'No se pudo descartar la postulación en progreso.',
        ),
        error,
      );
    }
  }
}
