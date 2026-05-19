export interface CandidateExperience {
  role: string;
  company: string;
  period: string;
}

export interface CandidateEducation {
  degree: string;
  institution: string;
  period: string;
}

export interface CandidateInterviewNote {
  authorName: string;
  date: string;
  rating: number;
  note: string;
}

export type CandidateStageStatus = 'completed' | 'current' | 'pending';

export type CandidateStageKey =
  | 'postulacion_recibida'
  | 'en_revision'
  | 'cv_presentado_area'
  | 'entrevista1_agendada'
  | 'entrevista1_evaluacion'
  | 'entrevista2_agendada'
  | 'entrevista2_evaluacion'
  | 'oferta_enviada'
  | 'contratado'
  | 'descartado';

export const STAGE_LABELS: Record<CandidateStageKey, string> = {
  postulacion_recibida: 'Postulación recibida',
  en_revision: 'En revisión',
  cv_presentado_area: 'CV presentado al área',
  entrevista1_agendada: 'Entrevista 1 agendada',
  entrevista1_evaluacion: 'Entrevista 1 – Evaluación',
  entrevista2_agendada: 'Entrevista 2 agendada',
  entrevista2_evaluacion: 'Entrevista 2 – Evaluación',
  oferta_enviada: 'Oferta enviada',
  contratado: 'Contratado',
  descartado: 'Descartado',
};

export interface CandidateStageEntry {
  key: CandidateStageKey;
  date?: string;
  status: CandidateStageStatus;
  description?: string;
  discardReason?: string;
}

export interface CandidateMockProfile {
  id: string;
  fullName: string;
  initials: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  experience: CandidateExperience[];
  education: CandidateEducation[];
  fitScore: number;
  detectedSkills: string[];
  gapSkills: string[];
  strengths: string[];
  interviewNotes: CandidateInterviewNote[];
  stageHistory: CandidateStageEntry[];
  currentStage: string;
  cvMockUrl: string | null;
}

export const CANDIDATES_MOCK: CandidateMockProfile[] = [
  {
    id: 'c1',
    fullName: 'María García López',
    initials: 'MG',
    title: 'Senior Frontend Developer',
    email: 'maria.garcia@email.com',
    phone: '+34 612 345 678',
    location: 'Madrid, España',
    experience: [
      {
        role: 'Lead Frontend Developer',
        company: 'TechCorp S.A.',
        period: 'Ene 2022 - Actualidad',
      },
      {
        role: 'Senior Frontend Developer',
        company: 'Digital Solutions Ltd.',
        period: 'Mar 2019 - Dic 2021',
      },
    ],
    education: [
      {
        degree: 'Ingeniería Informática',
        institution: 'Universidad Politécnica de Madrid',
        period: '2015 - 2019',
      },
    ],
    fitScore: 95,
    detectedSkills: ['React', 'TypeScript', 'Next.js', 'Node.js', 'GraphQL', 'Jest', 'TDD'],
    gapSkills: ['Kubernetes', 'Docker'],
    strengths: [
      'Liderazgo de equipo de 5 desarrolladores en aplicaciones React, TypeScript y Next.js',
      'Desarrollo de aplicaciones web complejas con React, Redux y GraphQL',
    ],
    interviewNotes: [
      {
        authorName: 'Carlos Méndez',
        date: '31/04/2026',
        rating: 5,
        note: 'Excelente conocimiento técnico, muy buena comunicación y experiencia alineada con nuestras necesidades.',
      },
    ],
    stageHistory: [
      {
        key: 'postulacion_recibida',
        date: '15/03/2026',
        status: 'completed',
        description: 'CV enviado por el candidato a través del portal.',
      },
      {
        key: 'en_revision',
        date: '17/03/2026',
        status: 'completed',
        description: 'Perfil evaluado por el equipo de Recursos Humanos.',
      },
      {
        key: 'cv_presentado_area',
        date: '19/03/2026',
        status: 'completed',
        description: 'Perfil derivado al área solicitante para su revisión.',
      },
      {
        key: 'entrevista1_agendada',
        date: '22/03/2026',
        status: 'completed',
      },
      {
        key: 'entrevista1_evaluacion',
        date: '28/03/2026',
        status: 'completed',
        description: 'Entrevista técnica realizada con Carlos Méndez.',
      },
      {
        key: 'entrevista2_agendada',
        date: '05/04/2026',
        status: 'current',
        description: 'Entrevista agendada con el equipo de liderazgo técnico.',
      },
      { key: 'entrevista2_evaluacion', status: 'pending' },
      { key: 'oferta_enviada', status: 'pending' },
      { key: 'contratado', status: 'pending' },
    ],
    currentStage: 'Entrevista 2 agendada',
    cvMockUrl: null,
  },
];
