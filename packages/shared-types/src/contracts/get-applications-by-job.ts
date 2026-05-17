import type { ApplicationStage, ApplicationStatus } from '../models';

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
