import type {
  CreateJobDTO,
  Job,
  JobLocation,
  JobStatus,
  Skill,
  UpdateJobDTO,
} from '../models';

export interface CreateJobPayload extends Omit<
  CreateJobDTO,
  'hiringManagerId' | 'status' | 'salaryMin' | 'salaryMax' | 'currency'
> {
  status?: JobStatus;
}

export interface CreateJobResponse {
  id: string;
}

export interface UpdatePositionPayload extends Partial<
  Omit<
    UpdateJobDTO,
    'status' | 'salaryMin' | 'salaryMax' | 'currency' | 'hiringManagerId'
  >
> {
  id: string;
  skills?: Skill[];
}

export interface UpdatePositionResponse {
  ok: true;
}

export interface UpdatePositionStatusPayload {
  id: string;
  status: JobStatus;
}

export interface UpdatePositionStatusResponse {
  ok: true;
}

export interface GetInternalJobDetailPayload {
  jobId: string;
}

export type GetInternalJobDetailResponse = Job;

export interface GetPositionPayload {
  id: string;
}

export type GetPositionResponse = Job;

export type ListPositionsOrderBy =
  | 'publishedAt'
  | 'title'
  | 'department'
  | 'status';
export type ListPositionsOrderDir = 'asc' | 'desc';

export interface ListPositionsFilters {
  search?: string;
  status?: JobStatus;
  location?: JobLocation;
  department?: string;
  page?: number;
  limit?: number;
  orderBy?: ListPositionsOrderBy;
  orderDir?: ListPositionsOrderDir;
}

export interface ListPositionsResponse {
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
}

export type ListDepartmentsResponse = string[];
