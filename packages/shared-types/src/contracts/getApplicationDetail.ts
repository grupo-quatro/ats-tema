// branch: fb-50-57
import type {
  ApplicationStage,
  ApplicationStatus,
} from '../models/application';
import type { Skill } from '../models/job';
import type { ParsedEducation, ParsedExperience } from '../models/parsing';
import type { SkillMatchStats } from '../models/skillMatch';

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface GetApplicationDetailPayload {
  applicationId: string;
}

// ─── Sub-DTOs ─────────────────────────────────────────────────────────────────

export interface ApplicationDetailCandidateDTO {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  yearsOfExperience?: number;
  /** Educación como texto libre (registro manual). */
  education?: string;
  technicalSkills?: string[];
  professionalSummary?: string;
  /** Experiencia estructurada extraída del CV parseado. Null si no tiene CV. */
  parsedExperience?: ParsedExperience[];
  /** Educación estructurada extraída del CV parseado. Null si no tiene CV. */
  parsedEducation?: ParsedEducation[];
  /** Path en Firebase Storage, e.g. cvs/candidateId/cv.pdf. Null si no subió CV. */
  cvStoragePath?: string | null;
}

export interface ApplicationDetailJobDTO {
  id: string;
  title: string;
  skills: Skill[];
}

// ─── DTO principal ────────────────────────────────────────────────────────────

export interface ApplicationDetailDTO {
  // — Postulación —
  id: string;
  stage: ApplicationStage;
  status: ApplicationStatus;
  fitScore?: number;
  fitSummary?: string;
  skillMatchStats?: SkillMatchStats;
  notes?: string;
  coverLetter?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  stageUpdatedAt: Date;

  // — Candidato consolidado —
  candidate: ApplicationDetailCandidateDTO;

  // — Puesto —
  job: ApplicationDetailJobDTO;
}
