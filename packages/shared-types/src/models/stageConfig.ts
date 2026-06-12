import type { ApplicationStage } from './application';
import type { EmailTemplateStage } from './emailTemplate';

export type TransitionMode =
  | 'recruiter_action' // recruiter autenticado actúa en la UI → changedBy = recruiter uid
  | 'on_application_submitted' // candidato completa y envía su postulación
  | 'on_cv_uploaded' // CV upload completado → encadena a applied
  | 'on_calendar_event' // candidato agenda via link de calendario
  | 'on_interview_submision' // entrevistador envía evaluación post-entrevista
  | 'on_offer_sent'; // email de oferta confirmado como enviado exitosamente

export interface StageConfig {
  label: string;
  emailTemplateStage: EmailTemplateStage | null; // null = no envía; valor = qué template usar
  transitionMode: TransitionMode;
  nextStage?: ApplicationStage; // encadena automáticamente cuando aplica
}

// Orden lineal — solo se puede avanzar en este array.
// schedule_hr_2 está al final porque es opcional y posterior a técnicas,
// pero isValidTransition lo permite desde cualquier punto >= cv_submitted.
export const PIPELINE_ORDER: ApplicationStage[] = [
  'profile_pending',
  'applied',
  'screening',
  'cv_submitted',
  'schedule_hr_1',
  'hr_1_scheduled',
  'hr_1_done',
  'schedule_tech_1',
  'tech_1_scheduled',
  'tech_1_done',
  'schedule_tech_2',
  'tech_2_scheduled',
  'tech_2_done',
  'schedule_hr_2',
  'hr_2_scheduled',
  'hr_2_done',
  'send_offer',
  'offer_sent',
  'hired',
];

// Accesibles desde cualquier stage activo, sin respetar el orden lineal
export const JUMP_STAGES: ApplicationStage[] = [
  'rejected',
  'withdrawn',
  'send_offer',
];

// Solo el sistema puede llegar aquí (no el recruiter directamente)
export const SYSTEM_ONLY_STAGES: ApplicationStage[] = [
  'profile_pending',
  'offer_sent',
];

export const STAGE_CONFIG: Record<ApplicationStage, StageConfig> = {
  profile_pending: {
    label: 'En proceso de registro',
    emailTemplateStage: null,
    transitionMode: 'on_cv_uploaded',
    nextStage: 'applied',
  },
  applied: {
    label: 'Postulación recibida',
    emailTemplateStage: 'application_received',
    transitionMode: 'on_application_submitted',
  },
  screening: {
    label: 'CV en revisión',
    emailTemplateStage: null,
    transitionMode: 'recruiter_action',
  },
  cv_submitted: {
    label: 'CV presentado al área técnica',
    emailTemplateStage: null,
    transitionMode: 'recruiter_action',
  },
  schedule_hr_1: {
    label: 'Contactamos para agendar 1ª Entrevista RRHH',
    emailTemplateStage: 'sch_interview_hr_1',
    transitionMode: 'recruiter_action',
  },
  hr_1_scheduled: {
    label: 'Evento del calendario — 1ª Entrevista RRHH',
    emailTemplateStage: 'interview_hr_1',
    transitionMode: 'on_calendar_event',
  },
  hr_1_done: {
    label: '1ª Entrevista RRHH Realizada',
    emailTemplateStage: null,
    transitionMode: 'on_interview_submision',
  },
  schedule_hr_2: {
    label: 'Contactamos para agendar 2ª Entrevista RRHH',
    emailTemplateStage: 'sch_interview_hr_2',
    transitionMode: 'recruiter_action',
  },
  hr_2_scheduled: {
    label: 'Evento del calendario — 2ª Entrevista RRHH',
    emailTemplateStage: 'interview_hr_2',
    transitionMode: 'on_calendar_event',
  },
  hr_2_done: {
    label: '2ª Entrevista RRHH Realizada',
    emailTemplateStage: null,
    transitionMode: 'on_interview_submision',
  },
  schedule_tech_1: {
    label: 'Contactamos para agendar 1ª Entrevista Técnica',
    emailTemplateStage: 'sch_interview_tech_1',
    transitionMode: 'recruiter_action',
  },
  tech_1_scheduled: {
    label: 'Evento del calendario — 1ª Entrevista Técnica',
    emailTemplateStage: 'interview_tech_1',
    transitionMode: 'on_calendar_event',
  },
  tech_1_done: {
    label: '1ª Entrevista Técnica Realizada',
    emailTemplateStage: null,
    transitionMode: 'on_interview_submision',
  },
  schedule_tech_2: {
    label: 'Contactamos para agendar 2ª Entrevista Técnica',
    emailTemplateStage: 'sch_interview_tech_2',
    transitionMode: 'recruiter_action',
  },
  tech_2_scheduled: {
    label: 'Evento del calendario — 2ª Entrevista Técnica',
    emailTemplateStage: 'interview_tech_2',
    transitionMode: 'on_calendar_event',
  },
  tech_2_done: {
    label: '2ª Entrevista Técnica Realizada',
    emailTemplateStage: null,
    transitionMode: 'on_interview_submision',
  },
  send_offer: {
    label: 'Enviamos oferta laboral',
    emailTemplateStage: 'offer',
    transitionMode: 'recruiter_action',
    nextStage: 'offer_sent',
  },
  offer_sent: {
    label: 'Oferta laboral enviada',
    emailTemplateStage: null,
    transitionMode: 'on_offer_sent',
  },
  hired: {
    label: 'Contratado',
    emailTemplateStage: 'hired',
    transitionMode: 'recruiter_action',
  },
  rejected: {
    label: 'Rechazado',
    emailTemplateStage: 'rejected',
    transitionMode: 'recruiter_action',
  },
  withdrawn: {
    label: 'Retirado',
    emailTemplateStage: 'withdrawn',
    transitionMode: 'recruiter_action',
  },
};

/**
 * Determina si la transición de `current` a `next` es permitida:
 * - SYSTEM_ONLY nunca son destino directo del recruiter.
 * - JUMP_STAGES (rejected, withdrawn, send_offer) accesibles desde cualquier stage activo.
 * - schedule_hr_2 accesible desde cualquier stage >= cv_submitted (entrevista 2ª RRHH
 *   puede ocurrir entre técnicas o después de ellas, pero siempre tras presentar el CV).
 * - El resto solo puede avanzar en PIPELINE_ORDER.
 */
export function isValidTransition(
  current: ApplicationStage,
  next: ApplicationStage,
): boolean {
  if (SYSTEM_ONLY_STAGES.includes(next)) return false;
  if (JUMP_STAGES.includes(next)) return true;
  if (next === 'schedule_hr_2') {
    const cvIdx = PIPELINE_ORDER.indexOf('cv_submitted');
    const ci = PIPELINE_ORDER.indexOf(current);
    return ci >= cvIdx;
  }
  const ci = PIPELINE_ORDER.indexOf(current);
  const ni = PIPELINE_ORDER.indexOf(next);
  return ni > ci;
}

/**
 * Dado el stage actual y un trigger (TransitionMode), devuelve el siguiente stage
 * en PIPELINE_ORDER que tenga ese transitionMode. Útil para resolver
 * transiciones automáticas donde múltiples stages comparten el mismo trigger.
 *
 * Ejemplo:
 *   findNextStageForTrigger('schedule_hr_1', 'on_calendar_event') → 'hr_1_scheduled'
 *   findNextStageForTrigger('schedule_tech_2', 'on_calendar_event') → 'tech_2_scheduled'
 */
export function findNextStageForTrigger(
  currentStage: ApplicationStage,
  trigger: TransitionMode,
): ApplicationStage | null {
  const currentIdx = PIPELINE_ORDER.indexOf(currentStage);
  for (let i = currentIdx + 1; i < PIPELINE_ORDER.length; i++) {
    const candidate = PIPELINE_ORDER[i] as ApplicationStage;
    if (STAGE_CONFIG[candidate].transitionMode === trigger) {
      return candidate;
    }
  }
  return null;
}
