import type {
  CandidatePostulationPayload,
  CandidatePostulationResponse,
  CandidatePostulationCVPayload,
  CandidatePostulationCVResponse,
  GetCandidateProfileForConfirmationPayload,
  GetCandidateProfileForConfirmationResponse,
} from '@ats/shared-types';

export interface ICandidateRepository {
  registerCandidate(
    payload: CandidatePostulationPayload,
  ): Promise<CandidatePostulationResponse>;
  registerCandidateCV(
    payload: CandidatePostulationCVPayload,
  ): Promise<CandidatePostulationCVResponse>;
  getCandidateProfileForConfirmation(
    payload: GetCandidateProfileForConfirmationPayload,
  ): Promise<GetCandidateProfileForConfirmationResponse>;
  uploadCv(candidateId: string, file: File): Promise<void>;
}
