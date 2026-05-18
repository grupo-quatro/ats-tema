import type { ApplicationStage, ApplicationStatus } from '../models';

export interface SubmitApplicationPayload {
  jobId: string;
}

export interface SubmitApplicationResponse {
  applicationId: string;
  candidateId: string;
  jobId: string;
  stage: ApplicationStage;
  status: ApplicationStatus;
}
