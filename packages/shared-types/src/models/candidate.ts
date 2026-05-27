import type { ParsedCandidateProfileData } from './parsing/parsedData';
import type { ParsedEducation } from './parsing/parsedEducation';
import type { ParsedExperience } from './parsing/parsedExperience';

export type CvParseStatus =
  | 'not_required'
  | 'pending'
  | 'processing'
  | 'done'
  | 'failed';

export type RegistrationType = 'specific' | 'general';
export type RegistrationSource = 'manual' | 'cv_upload';

export type CandidateProfileStatus = 'draft' | 'completed';

export interface Candidate {
  id: string;

  firstName?: string;
  lastName?: string;
  fullName?: string;

  email?: string;
  phone?: string;
  location?: string;

  yearsOfExperience?: number;
  education?: string;
  technicalSkills?: string[];
  professionalSummary?: string;
  parsedData?: ParsedCandidateProfileData | null;
  parsedCv?: {
    experience?: ParsedExperience[];
    education?: ParsedEducation[];
  };

  profileStatus: CandidateProfileStatus;
  registrationType: RegistrationType;
  registrationSource: RegistrationSource;
  cvParseStatus: CvParseStatus;
  cvStoragePath?: string | null;
  cvParseError?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCandidateDTO {
  firstName?: string;
  lastName?: string;
  fullName?: string;

  email?: string;
  phone?: string;
  location?: string;

  yearsOfExperience?: number;
  education?: string;
  technicalSkills?: string[];
  professionalSummary?: string;
  parsedData?: ParsedCandidateProfileData | null;
  parsedCv?: {
    experience?: ParsedExperience[];
    education?: ParsedEducation[];
  };

  profileStatus: CandidateProfileStatus;
  registrationType: RegistrationType;
  registrationSource: RegistrationSource;
  cvParseStatus: CvParseStatus;
}
