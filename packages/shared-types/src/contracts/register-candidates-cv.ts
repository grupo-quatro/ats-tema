import type { ApplicationStatus, CvParseStatus } from '../models';

export interface RegisterCandidateCVPayload {
  jobId: string;
}

export interface RegisterCandidateCVResponse {
  candidateId: string;
  applicationId: string;
  uploadBasePath: string;
  cvParseStatus: CvParseStatus;
  applicationStatus: ApplicationStatus;
}
