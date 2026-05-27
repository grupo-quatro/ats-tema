import type { ApplicationStage } from '@ats/shared-types';

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  profile_pending: 'En proceso de registro',
  applied: 'Postulación recibida',
  screening: 'En revisión',
  cv_submitted: 'CV presentado a área',
  interview_1_scheduled: 'Entrevista 1 agendada',
  interview_1_done: 'Entrevista 1 realizada — en evaluación',
  interview_2_scheduled: 'Entrevista 2 agendada',
  interview_2_done: 'Entrevista 2 realizada — en evaluación',
  offer_sent: 'Oferta enviada',
  hired: 'Contratado',
  rejected: 'Descartado',
  withdrawn: 'Retirado',
};
