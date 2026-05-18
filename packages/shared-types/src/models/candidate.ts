import type { ParsedCV } from './parsing';

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

  name?: string;

  email?: string;
  phone?: string;
  location?: string;

  cvUrl?: string;
  cvFileName?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;

  yearsOfExperience?: number;
  education?: string;
  technicalSkills?: string[];
  professionalSummary?: string;
  parsedCv?: ParsedCV;

  profileStatus?: CandidateProfileStatus;
  registrationType?: RegistrationType;
  registrationSource?: RegistrationSource;
  cvParseStatus?: CvParseStatus;
  cvStoragePath?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCandidateDTO {
  firstName?: string;
  lastName?: string;
  fullName?: string;

  name?: string;

  email?: string;
  phone?: string;
  location?: string;

  cvUrl?: string;
  cvFileName?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;

  yearsOfExperience?: number;
  education?: string;
  technicalSkills?: string[];
  professionalSummary?: string;

  profileStatus: CandidateProfileStatus;
  registrationType: RegistrationType;
  registrationSource: RegistrationSource;
  cvParseStatus: CvParseStatus;
}

export type UpdateCandidateDTO = Partial<Omit<Candidate, 'id' | 'createdAt'>>;
