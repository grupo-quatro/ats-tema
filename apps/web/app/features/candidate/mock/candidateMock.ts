import type { Skill } from '@ats/shared-types';

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
  | 'contacto_entrevista_rrhh_1'
  | 'entrevista_rrhh_1_agendada'
  | 'entrevista_rrhh_1_realizada'
  | 'contacto_entrevista_rrhh_2'
  | 'entrevista_rrhh_2_agendada'
  | 'entrevista_rrhh_2_realizada'
  | 'cv_presentado_area'
  | 'contacto_entrevista_tecnica_1'
  | 'entrevista_tecnica_1_agendada'
  | 'entrevista_tecnica_1_realizada'
  | 'contacto_entrevista_tecnica_2'
  | 'entrevista_tecnica_2_agendada'
  | 'entrevista_tecnica_2_realizada'
  | 'enviar_oferta'
  | 'oferta_enviada'
  | 'contratado'
  | 'descartado';

export const STAGE_ORDER: CandidateStageKey[] = [
  'postulacion_recibida',
  'en_revision',
  'contacto_entrevista_rrhh_1',
  'entrevista_rrhh_1_agendada',
  'entrevista_rrhh_1_realizada',
  'cv_presentado_area',
  'contacto_entrevista_tecnica_1',
  'entrevista_tecnica_1_agendada',
  'entrevista_tecnica_1_realizada',
  'contacto_entrevista_tecnica_2',
  'entrevista_tecnica_2_agendada',
  'entrevista_tecnica_2_realizada',
  'contacto_entrevista_rrhh_2',
  'entrevista_rrhh_2_agendada',
  'entrevista_rrhh_2_realizada',
  'enviar_oferta',
  'oferta_enviada',
  'contratado',
];

export const STAGE_LABELS: Record<CandidateStageKey, string> = {
  postulacion_recibida: 'Postulación recibida',
  en_revision: 'CV en revisión',
  contacto_entrevista_rrhh_1: 'Contactamos para agendar 1ª Entrevista RRHH',
  entrevista_rrhh_1_agendada: '1ª Entrevista RRHH Agendada',
  entrevista_rrhh_1_realizada: '1ª Entrevista RRHH Realizada',
  contacto_entrevista_rrhh_2: 'Contactamos para agendar 2ª Entrevista RRHH',
  entrevista_rrhh_2_agendada: '2ª Entrevista RRHH Agendada',
  entrevista_rrhh_2_realizada: '2ª Entrevista RRHH Realizada',
  cv_presentado_area: 'CV presentado al área técnica',
  contacto_entrevista_tecnica_1:
    'Contactamos para agendar 1ª Entrevista Técnica',
  entrevista_tecnica_1_agendada: '1ª Entrevista Técnica Agendada',
  entrevista_tecnica_1_realizada: '1ª Entrevista Técnica Realizada',
  contacto_entrevista_tecnica_2:
    'Contactamos para agendar 2ª Entrevista Técnica',
  entrevista_tecnica_2_agendada: '2ª Entrevista Técnica Agendada',
  entrevista_tecnica_2_realizada: '2ª Entrevista Técnica Realizada',
  enviar_oferta: 'Enviar Oferta',
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
  applicationId: string;
  fullName: string;
  initials: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  yearsOfExperience?: number;
  professionalSummary?: string;
  experience: CandidateExperience[];
  education: CandidateEducation[];
  fitScore: number;
  detectedSkills: string[];
  gapSkills: string[];
  jobSkills: Skill[];
  strengths: string[];
  interviewNotes: CandidateInterviewNote[];
  stageHistory: CandidateStageEntry[];
  currentStage: string;
  cvMockUrl: string | null;
}

export const CANDIDATES_MOCK: CandidateMockProfile[] = [
  {
    id: 'c1',
    applicationId: '',
    fullName: 'María García López',
    initials: 'MG',
    title: 'Senior Frontend Developer',
    email: 'maria.garcia@email.com',
    phone: '+34 612 345 678',
    location: 'Madrid, España',
    yearsOfExperience: 5,
    professionalSummary:
      'Desarrolladora frontend senior con experiencia liderando equipos y construyendo aplicaciones web complejas.',
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
    detectedSkills: [
      'React',
      'TypeScript',
      'Next.js',
      'Node.js',
      'GraphQL',
      'Jest',
      'TDD',
    ],
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
        key: 'contacto_entrevista_rrhh_1',
        date: '19/03/2026',
        status: 'completed',
        description:
          'Se contactó al candidato para agendar la 1ª entrevista RRHH.',
      },
      {
        key: 'entrevista_rrhh_1_agendada',
        date: '22/03/2026',
        status: 'completed',
      },
      {
        key: 'entrevista_rrhh_1_realizada',
        date: '28/03/2026',
        status: 'completed',
        description: 'Entrevista RRHH realizada con Carlos Méndez.',
      },
      {
        key: 'contacto_entrevista_rrhh_2',
        date: '05/04/2026',
        status: 'current',
        description: 'Contactando para agendar la 2ª entrevista RRHH.',
      },
      { key: 'entrevista_rrhh_2_agendada', status: 'pending' },
      { key: 'entrevista_rrhh_2_realizada', status: 'pending' },
      { key: 'cv_presentado_area', status: 'pending' },
      { key: 'oferta_enviada', status: 'pending' },
      { key: 'contratado', status: 'pending' },
    ],
    currentStage: 'Contactamos para agendar 2ª Entrevista RRHH',
    jobSkills: [],
    cvMockUrl: null,
  },
];
