export type JobStatus = 'draft' | 'open' | 'paused' | 'closed';

export type JobLocation = 'remote' | 'on-site' | 'hybrid';

export type SkillType = 'mandatory' | 'desirable';

export interface Skill {
  name: string;
  weight: number;
  type: SkillType;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  seniority: string;
  location: JobLocation;
  city?: string;
  description: string;
  skills: Skill[];
  requirements?: string[];
  observations?: string;
  additionalCriteria?: string[];
  slug: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  type?: string; // e.g. Full-time, Part-time
  candidates?: number;
  status: JobStatus;
  responsabilities: string[];
  benefits: string[];
  hiringManagerId: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  publishedAt?: Date;
  deletedAt?: Date;
}

export type CreateJobDTO = Omit<
  Job,
  'id' | 'createdAt' | 'updatedAt' | 'closedAt' | 'publishedAt' | 'deletedAt'
>;

export type UpdateJobDTO = Partial<Omit<Job, 'id' | 'createdAt'>>;
