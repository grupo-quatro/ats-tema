// branch: fb-50-57
import type { SkillMatchStats } from './skillMatch';

export type ApplicationStage =
  | 'profile_pending'
  | 'applied'
  | 'screening'
  | 'cv_submitted'
  | 'schedule_hr_1'
  | 'hr_1_scheduled'
  | 'hr_1_done'
  | 'schedule_hr_2'
  | 'hr_2_scheduled'
  | 'hr_2_done'
  | 'schedule_tech_1'
  | 'tech_1_scheduled'
  | 'tech_1_done'
  | 'schedule_tech_2'
  | 'tech_2_scheduled'
  | 'tech_2_done'
  | 'send_offer'
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
  coverLetter?: string;

  /**
   * Estadísticas de match de skills calculadas automáticamente por Cloud Function
   * al momento de crear la postulación. Usa los pesos (weight) y tipos (type)
   * de Job.skills para ponderar el score.
   */
  skillMatchStats?: SkillMatchStats;

  rejectionReason?: string;
  notes?: string;
  /** Fortalezas de la candidatura evaluadas por el reclutador. Editable desde el perfil del candidato. */ // branch: fb-50-57
  fortalezas?: string[];

  createdAt: Date;
  updatedAt: Date;
  stageUpdatedAt: Date; // para calcular tiempo en cada etapa
}

export interface StageHistoryEntry {
  id: string;
  stage: ApplicationStage;
  changedAt: Date;
  changedBy: string;
  changedByEmail: string;
  notes?: string;
  rejectionReason?: string;
}

export type CreateStageHistoryEntryDTO = Omit<
  StageHistoryEntry,
  'id' | 'changedAt'
>;

export type CreateApplicationDTO = Omit<
  Application,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'stageUpdatedAt'
  | 'fitScore'
>;
export type UpdateApplicationDTO = Partial<
  Omit<Application, 'id' | 'createdAt'>
>;
