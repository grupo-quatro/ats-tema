export type JobStatus = 'draft' | 'open' | 'paused' | 'closed';

export type JobLocation = 'remote' | 'on-site' | 'hybrid';

export interface Job {
  id: string;
  title: string;
  department: string;
  location: JobLocation;
  city?: string;
  description: string;
  requirements: string[];
  niceToHave?: string[];
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  status: JobStatus;
  hiringManagerId: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  publishedAt?: Date;
}

export type CreateJobDTO = Omit<
  Job,
  'id' | 'createdAt' | 'updatedAt' | 'closedAt' | 'publishedAt'
>;
export type UpdateJobDTO = Partial<Omit<Job, 'id' | 'createdAt'>>;
