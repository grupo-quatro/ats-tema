export type ApplicationStage =
  | 'profile_pending'
  | 'applied'
  | 'screening'
  | 'interview_hr'
  | 'interview_technical'
  | 'interview_final'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export type ApplicationStatus =
  | 'active'
  | 'draft'
  | 'rejected'
  | 'withdrawn'
  | 'hired';

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;

  jobTitle?: string;
  candidateName?: string;
  candidateEmail?: string;

  stage: ApplicationStage;
  status: ApplicationStatus;

  fitScore?: number;
  fitSummary?: string;
  coverLetter?: string;

  rejectionReason?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
  stageUpdatedAt: Date;
}

export type CreateApplicationDTO = Omit<
  Application,
  'id' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt' | 'fitScore' | 'fitSummary'
>;

export type UpdateApplicationDTO = Partial<Omit<Application, 'id' | 'createdAt'>>;
