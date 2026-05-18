import type { ApplicationStatus, CvParseStatus } from '../models';
import { CandidatePostulationBase } from './candidatePostulationBase';

export interface CandidatePostulationPayload extends CandidatePostulationBase {
  jobId: string;
}

export interface CandidatePostulationResponse {
  candidateId: string;
  applicationId: string;
  cvParseStatus: CvParseStatus;
  applicationStatus: ApplicationStatus;
}
