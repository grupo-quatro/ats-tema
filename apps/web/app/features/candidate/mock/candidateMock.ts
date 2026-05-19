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

export interface CandidateStageEntry {
  label: string;
  date?: string;
  status: CandidateStageStatus;
  description?: string;
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
        label: 'Postulación recibida',
        date: '15/03/2026',
        status: 'completed',
        description: 'CV enviado por el candidato a través del portal.',
      },
      {
        label: 'Revisión de perfil',
        date: '17/03/2026',
        status: 'completed',
        description: 'Perfil evaluado y calificado por el equipo de Recursos Humanos.',
      },
      {
        label: 'Primera entrevista',
        date: '22/03/2026',
        status: 'completed',
        description: 'Entrevista técnica realizada con Carlos Méndez.',
      },
      {
        label: 'Segunda entrevista',
        date: '05/04/2026',
        status: 'current',
        description: 'Entrevista agendada con el equipo de liderazgo técnico.',
      },
      {
        label: 'Evaluación final',
        status: 'pending',
      },
      {
        label: 'Oferta laboral',
        status: 'pending',
      },
    ],
    currentStage: 'Entrevista 2 agendada',
    cvMockUrl: null,
  },
];
