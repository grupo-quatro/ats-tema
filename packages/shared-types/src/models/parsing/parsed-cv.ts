import { ParsedEducation } from "./parsed-education";
import { ParsedExperience } from "./parsed-experience";

export interface ParsedCV {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  hardSkills?: string[];
  softSkills?: string[];
  languages?: string[];
  education?: ParsedEducation[];
  experience?: ParsedExperience[];
  rawText?: string;
}
