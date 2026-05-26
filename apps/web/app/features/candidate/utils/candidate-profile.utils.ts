import type {
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
  'cv_submitted',
  'interview_1_scheduled',
  'interview_1_done',
  'interview_2_scheduled',
  'interview_2_done',
  'offer_sent',
  'hired',
];

export const STAGE_KEY_MAP: Partial<
  Record<ApplicationStage, CandidateStageKey>
> = {
  applied: 'postulacion_recibida',
  screening: 'en_revision',
  cv_submitted: 'cv_presentado_area',
  interview_1_scheduled: 'entrevista1_agendada',
  interview_1_done: 'entrevista1_evaluacion',
  interview_2_scheduled: 'entrevista2_agendada',
  interview_2_done: 'entrevista2_evaluacion',
  offer_sent: 'oferta_enviada',
  hired: 'contratado',
  rejected: 'descartado',
  withdrawn: 'descartado',
};

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

export function mapApplicationToProfile(
  application: ApplicationWithCandidateDTO,
): CandidateMockProfile {
  const stageKey = STAGE_KEY_MAP[application.stage];

  return {
    id: application.candidateId,
    fullName: application.candidateName ?? 'Candidato sin nombre',
    initials: getInitials(application.candidateName),
    title: '',
    email: application.candidateEmail ?? '',
    phone: '',
    location: '',
    experience: [],
    education: [],
    fitScore: application.fitScore ?? 0,
    detectedSkills: [],
    gapSkills: [],
    strengths: application.fitSummary ? [application.fitSummary] : [],
    interviewNotes: application.notes
      ? [
          {
            authorName: 'Reclutador',
            date: new Date(application.updatedAt).toLocaleDateString('es-AR'),
            rating: 0,
            note: application.notes,
          },
        ]
      : [],
    stageHistory: buildStageHistory(application.stage),
    currentStage: stageKey
      ? (STAGE_LABELS[stageKey] ?? application.stage)
      : application.stage,
    cvMockUrl: null,
  };
}
