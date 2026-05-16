import type { ApplicationStatus, CvParseStatus } from '../models';

export interface RegisterCandidatePayload {
  jobId: string;

  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  location?: string;
  yearsOfExperience?: number;
  education?: string;
  technicalSkills?: string[];
  professionalSummary?: string;
}

export interface RegisterCandidateResponse {
  candidateId: string;
  applicationId: string;
  cvParseStatus: CvParseStatus;
  applicationStatus: ApplicationStatus;
}
