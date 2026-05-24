import type {
  CreateJobDTO,
  Job,
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
