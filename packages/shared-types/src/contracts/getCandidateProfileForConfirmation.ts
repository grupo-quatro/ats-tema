import type { CandidateProfileStatus, CvParseStatus } from '../models';
import type { ParsedEducation, ParsedExperience } from '../models/parsing';

export interface CandidateProfileForConfirmation {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  expectedMonthlySalaryArs?: number;
  linkedinUrl?: string;
  location?: string;
  yearsOfExperience?: number;
  education?: string;
  technicalSkills?: string[];
  professionalSummary?: string;
  parsedExperience?: ParsedExperience[];
  parsedEducation?: ParsedEducation[];
}

export interface GetCandidateProfileForConfirmationPayload {
  candidateId: string;
  applicationId: string;
}

export interface GetCandidateProfileForConfirmationResponse {
  candidateId: string;
  applicationId: string;
  cvParseStatus: CvParseStatus;
  cvParseError: string | null;
  profileStatus: CandidateProfileStatus;
  profile: CandidateProfileForConfirmation;
}
