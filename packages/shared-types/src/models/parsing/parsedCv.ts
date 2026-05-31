import type { ParsedEducation } from './parsedEducation';
import type { ParsedExperience } from './parsedExperience';

export interface ParsedCV {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  professionalSummary?: string;
  yearsOfExperience?: number;
  education?: string;
  technicalSkills?: string[];
  skills?: string[];
  hardSkills?: string[];
  parsedExperience?: ParsedExperience[];
  parsedEducation?: ParsedEducation[];
  rawText?: string;
}
