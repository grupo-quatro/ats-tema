import type { ApplicationStatus, CvParseStatus } from '../models';

export interface CandidatePostulationCVPayload {
  jobId: string;
}

export interface CandidatePostulationCVResponse {
  candidateId: string;
  applicationId: string;
  uploadBasePath: string;
  cvParseStatus: CvParseStatus;
  applicationStatus: ApplicationStatus;
}
