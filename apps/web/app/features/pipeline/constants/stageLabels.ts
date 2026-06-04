import type { ApplicationStage } from '@ats/shared-types';

export type VisibleApplicationStage = Exclude<
  ApplicationStage,
  'profile_pending'
>;

export const VISIBLE_STAGE_LABELS: Record<VisibleApplicationStage, string> = {
  applied: 'Postulacion recibida',
  screening: 'En revision',
  cv_submitted: 'CV presentado al area',
  interview_1_scheduled: 'Entrevista 1 agendada',
  interview_1_done: 'Entrevista 1 realizada / en evaluacion',
  interview_2_scheduled: 'Entrevista 2 agendada',
  interview_2_done: 'Entrevista 2 realizada / en evaluacion',
  offer_sent: 'Oferta enviada',
  hired: 'Contratado',
  rejected: 'Descartado',
  withdrawn: 'Retirado',
};

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  profile_pending: VISIBLE_STAGE_LABELS.applied,
  ...VISIBLE_STAGE_LABELS,
};

export function isVisibleApplicationStage(
  stage: ApplicationStage,
): stage is VisibleApplicationStage {
  return stage !== 'profile_pending';
}

export function getStageLabel(stage: ApplicationStage): string {
  return STAGE_LABELS[stage] ?? 'Etapa no disponible';
}
