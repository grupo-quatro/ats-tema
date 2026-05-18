import type {
  CandidatePostulationPayload,
  CandidatePostulationResponse,
  CandidatePostulationCVPayload,
  CandidatePostulationCVResponse,
} from '@ats/shared-types';

export interface ICandidateRepository {
  registerCandidate(
    payload: CandidatePostulationPayload,
  ): Promise<CandidatePostulationResponse>;
  registerCandidateCV(
    payload: CandidatePostulationCVPayload,
  ): Promise<CandidatePostulationCVResponse>;
  uploadCv(candidateId: string, file: File): Promise<void>;
}
