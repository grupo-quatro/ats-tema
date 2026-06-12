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
  coverLetter?: string;
  /**
   * Estadísticas de match ponderado de skills.
   * Puede estar ausente si todavía no existe un cálculo válido.
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
