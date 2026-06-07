import type {
  ApplicationDetailDTO,
  ApplicationWithCandidateDTO,
  ApplicationStage,
} from '@ats/shared-types';
import type {
  CandidateMockProfile,
  CandidateStageEntry,
  CandidateStageKey,
} from '../mock/candidateMock';
import { STAGE_LABELS } from '../mock/candidateMock';

export const STAGE_ORDER: ApplicationStage[] = [
  'applied',
  'screening',
  'schedule_hr_1',
  'hr_1_scheduled',
  'hr_1_done',
  'cv_submitted',
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

export const STAGE_KEY_MAP: Partial<
  Record<ApplicationStage, CandidateStageKey>
> = {
  applied: 'postulacion_recibida',
  screening: 'en_revision',
  schedule_hr_1: 'contacto_entrevista_rrhh_1',
  hr_1_scheduled: 'entrevista_rrhh_1_agendada',
  hr_1_done: 'entrevista_rrhh_1_realizada',
  schedule_hr_2: 'contacto_entrevista_rrhh_2',
  hr_2_scheduled: 'entrevista_rrhh_2_agendada',
  hr_2_done: 'entrevista_rrhh_2_realizada',
  cv_submitted: 'cv_presentado_area',
  schedule_tech_1: 'contacto_entrevista_tecnica_1',
  tech_1_scheduled: 'entrevista_tecnica_1_agendada',
  tech_1_done: 'entrevista_tecnica_1_realizada',
  schedule_tech_2: 'contacto_entrevista_tecnica_2',
  tech_2_scheduled: 'entrevista_tecnica_2_agendada',
  tech_2_done: 'entrevista_tecnica_2_realizada',
  send_offer: 'enviar_oferta',
  offer_sent: 'oferta_enviada',
  hired: 'contratado',
  rejected: 'descartado',
  withdrawn: 'descartado',
};

export const CANDIDATE_STAGE_TO_APP_STAGE: Record<
  CandidateStageKey,
  ApplicationStage
> = {
  postulacion_recibida: 'applied',
  en_revision: 'screening',
  contacto_entrevista_rrhh_1: 'schedule_hr_1',
  entrevista_rrhh_1_agendada: 'hr_1_scheduled',
  entrevista_rrhh_1_realizada: 'hr_1_done',
  contacto_entrevista_rrhh_2: 'schedule_hr_2',
  entrevista_rrhh_2_agendada: 'hr_2_scheduled',
  entrevista_rrhh_2_realizada: 'hr_2_done',
  cv_presentado_area: 'cv_submitted',
  contacto_entrevista_tecnica_1: 'schedule_tech_1',
  entrevista_tecnica_1_agendada: 'tech_1_scheduled',
  entrevista_tecnica_1_realizada: 'tech_1_done',
  contacto_entrevista_tecnica_2: 'schedule_tech_2',
  entrevista_tecnica_2_agendada: 'tech_2_scheduled',
  entrevista_tecnica_2_realizada: 'tech_2_done',
  enviar_oferta: 'send_offer',
  oferta_enviada: 'offer_sent',
  contratado: 'hired',
  descartado: 'rejected',
};

export function getCandidateStageLabel(stage: ApplicationStage): string {
  const stageKey = STAGE_KEY_MAP[stage];
  return stageKey ? STAGE_LABELS[stageKey] : STAGE_LABELS.postulacion_recibida;
}

export function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function buildStageHistory(
  currentStage: ApplicationStage,
): CandidateStageEntry[] {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);

  return STAGE_ORDER.map((stage, index) => {
    const key = STAGE_KEY_MAP[stage];
    if (!key) return null;

    let status: CandidateStageEntry['status'] = 'pending';
    if (index < currentIndex) status = 'completed';
    if (index === currentIndex) status = 'current';

    return { key, status };
  }).filter(Boolean) as CandidateStageEntry[];
}

function formatPeriod(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return '';
  if (startDate && !endDate) return startDate;
  if (!startDate && endDate) return endDate;
  return `${startDate} - ${endDate}`;
}

function mapEducation(
  candidate: ApplicationDetailDTO['candidate'],
): CandidateMockProfile['education'] {
  const parsedEducation =
    candidate.parsedEducation?.map((edu) => ({
      degree: edu.degree ?? '',
      institution: edu.institution ?? '',
      period: formatPeriod(edu.startDate, edu.endDate),
    })) ?? [];

  if (parsedEducation.length > 0) {
    return parsedEducation;
  }

  return candidate.education
    ? [
        {
          degree: candidate.education,
          institution: '',
          period: '',
        },
      ]
    : [];
}

export function mapApplicationToProfile(
  application: ApplicationWithCandidateDTO,
): CandidateMockProfile {
  return {
    id: application.candidateId,
    applicationId: application.id,
    fullName: application.candidateName ?? 'Candidato sin nombre',
    initials: getInitials(application.candidateName),
    title: '',
    email: application.candidateEmail ?? '',
    phone: '',
    location: '',
    yearsOfExperience: undefined,
    professionalSummary: undefined,
    experience: [],
    education: [],
    fitScore: application.fitScore ?? 0,
    detectedSkills: [],
    gapSkills: [],
    jobSkills: [],
    strengths: application.fitSummary ? [application.fitSummary] : [],
    interviewNotes: [],
    stageHistory: buildStageHistory(application.stage),
    currentStage: getCandidateStageLabel(application.stage),
    cvMockUrl: null,
  };
}

export function mapDetailToProfile(
  detail: ApplicationDetailDTO,
): CandidateMockProfile {
  const { candidate, skillMatchStats } = detail;

  return {
    id: candidate.id,
    applicationId: detail.id,
    fullName: candidate.fullName ?? 'Candidato sin nombre',
    initials: getInitials(candidate.fullName),
    title: detail.job.title,
    email: candidate.email ?? '',
    phone: candidate.phone ?? '',
    location: candidate.location ?? '',
    yearsOfExperience: candidate.yearsOfExperience,
    professionalSummary: candidate.professionalSummary,
    experience:
      candidate.parsedExperience?.map((exp) => ({
        role: exp.role ?? '',
        company: exp.company ?? '',
        period: formatPeriod(exp.startDate, exp.endDate),
      })) ?? [],
    education: mapEducation(candidate),
    fitScore: detail.fitScore ?? 0,
    detectedSkills: candidate.technicalSkills ?? [],
    gapSkills: skillMatchStats?.skillsFaltantes.map((s) => s.name) ?? [],
    jobSkills: detail.job.skills,
    strengths: detail.fitSummary ? [detail.fitSummary] : [],
    interviewNotes: [],
    stageHistory: buildStageHistory(detail.stage),
    currentStage: getCandidateStageLabel(detail.stage),
    cvMockUrl: null,
  };
}
