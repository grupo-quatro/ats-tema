export type ApplicationStage =
  | 'profile_pending' // TODO: migrar a 'applied' cuando se consolide el flujo CV (candidateService)
  | 'applied'
  | 'screening'
  | 'cv_submitted'
  | 'interview_1_scheduled'
  | 'interview_1_done'
  | 'interview_2_scheduled'
  | 'interview_2_done'
  | 'offer_sent'
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

  fitScore?: number; // 0-100, generado por AI tras parsear CV
  fitSummary?: string; // resumen generado por AI
  coverLetter?: string;

  rejectionReason?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
  stageUpdatedAt: Date; // para calcular tiempo en cada etapa
}

export type CreateApplicationDTO = Omit<
  Application,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'stageUpdatedAt'
  | 'fitScore'
  | 'fitSummary'
>;
export type UpdateApplicationDTO = Partial<
  Omit<Application, 'id' | 'createdAt'>
>;
