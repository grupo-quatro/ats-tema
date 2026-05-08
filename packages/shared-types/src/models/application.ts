export type ApplicationStage =
  | "applied"
  | "screening"
  | "interview_hr"
  | "interview_technical"
  | "interview_final"
  | "offer"
  | "hired"
  | "rejected"
  | "withdrawn";

export type ApplicationStatus = "active" | "rejected" | "withdrawn" | "hired";

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;

  jobTitle: string;
  candidateName: string;
  candidateEmail: string;

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
  | "id"
  | "createdAt"
  | "updatedAt"
  | "stageUpdatedAt"
  | "fitScore"
  | "fitSummary"
>;
export type UpdateApplicationDTO = Partial<
  Omit<Application, "id" | "createdAt">
>;
