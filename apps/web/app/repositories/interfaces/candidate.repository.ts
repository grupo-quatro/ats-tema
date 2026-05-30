import type {
  CandidatePostulationPayload,
  CandidatePostulationResponse,
  CandidatePostulationCVPayload,
  CandidatePostulationCVResponse,
  ConfirmCandidateProfilePayload,
  ConfirmCandidateProfileResponse,
  DiscardCandidateDraftPayload,
  DiscardCandidateDraftResponse,
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
  confirmCandidateProfile(
    payload: ConfirmCandidateProfilePayload,
  ): Promise<ConfirmCandidateProfileResponse>;
  discardCandidateDraft(
    payload: DiscardCandidateDraftPayload,
  ): Promise<DiscardCandidateDraftResponse>;
  uploadCv(candidateId: string, file: File): Promise<void>;
}
