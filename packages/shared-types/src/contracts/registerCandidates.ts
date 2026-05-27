import { CvParseStatus } from '../models';

export interface RegisterCandidatePayload {
  fullName: string;
  email: string;
  hasCv: boolean;
  jobId?: string;
}

export interface RegisterCandidateResponse {
  candidateId: string;
  cvParseStatus: CvParseStatus;
}
