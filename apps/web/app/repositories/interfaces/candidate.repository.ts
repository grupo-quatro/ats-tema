import type {
  RegisterCandidatePayload,
  RegisterCandidateResponse,
  RegisterCandidateCVPayload,
  RegisterCandidateCVResponse,
} from '@ats/shared-types';

export interface ICandidateRepository {
  registerCandidate(
    payload: RegisterCandidatePayload,
  ): Promise<RegisterCandidateResponse>;
  registerCandidateCV(
    payload: RegisterCandidateCVPayload,
  ): Promise<RegisterCandidateCVResponse>;
  uploadCv(candidateId: string, file: File): Promise<void>;
}
