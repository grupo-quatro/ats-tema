// branch: fb-50-57
import type {
  ApplicationStage,
  ApplicationStatus,
  SkillMatchStats,
} from '../models';

export type ApplicationSortField = 'createdAt' | 'fitScore';
export type SortDirection = 'asc' | 'desc';

export interface QueryOptions {
  orderBy?: ApplicationSortField;
  orderDirection?: SortDirection;
  limit?: number;
}

export interface ApplicationWithCandidateDTO {
  id: string;
  jobId: string;
  candidateId: string;
  stage: ApplicationStage;
  status: ApplicationStatus;
  fitScore?: number;
  fitSummary?: string;
  coverLetter?: string;
  /**
   * Estadísticas de match ponderado de skills.
   * Disponible tras la ejecución del trigger onApplicationCreated.
   * Puede estar ausente en postulaciones antiguas o si el trigger aún no corrió.
   */
  skillMatchStats?: SkillMatchStats;
  candidateName?: string;
  candidateEmail?: string;
  notes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  stageUpdatedAt: Date;
}

export interface GetApplicationsByJobPayload {
  jobId: string;
  orderBy?: ApplicationSortField;
  orderDirection?: SortDirection;
  limit?: number;
}

export type GetApplicationsByJobResponse = ApplicationWithCandidateDTO[];
