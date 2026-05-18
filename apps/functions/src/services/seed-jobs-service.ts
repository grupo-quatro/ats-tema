import type { JobLocation, JobStatus, Skill } from '@ats/shared-types';

import {
  JobsRepository,
  type SeedJobInput,
} from '../repositories/jobs-repository';

type SeedJobDefinition = {
  id: string;
  data: SeedJobInput;
};

export type SeedJobsResult = {
  processed: number;
  created: number;
  updated: number;
  jobIds: string[];
};

export class SeedJobsServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SeedJobsServiceError';
  }
}

const PUBLISHED_AT = new Date('2026-05-16T12:00:00.000Z');

function buildSkills(
  mandatory: Array<{ name: string; weight: number }>,
  desirable: Array<{ name: string; weight: number }> = [],
): Skill[] {
  return [
    ...mandatory.map((skill) => ({
      ...skill,
      type: 'mandatory' as const,
    })),
    ...desirable.map((skill) => ({
      ...skill,
      type: 'desirable' as const,
    })),
  ];
}

function buildJob(
  id: string,
  overrides: Partial<SeedJobInput> & {
    title: string;
    department: string;
    seniority: string;
    location: JobLocation;
    description: string;
    skills: Skill[];
    hiringManagerId: string;
    status: JobStatus;
    responsabilities: string[];
    benefits: string[];
  },
): SeedJobDefinition {
  return {
    id,
    data: {
      currency: 'USD',
      ...overrides,
    } as SeedJobInput,
  };
}

const JOB_SEEDS: SeedJobDefinition[] = [
  buildJob('frontend-ssr-developer', {
    title: 'Frontend SSR Developer',
    department: 'Engineering',
    seniority: 'semi-senior',
    location: 'remote',
    description:
      'Buscamos un perfil frontend con foco en SSR, experiencia en React y buen criterio para interfaces de producto.',
    skills: buildSkills(
      [
        { name: 'React', weight: 5 },
        { name: 'Next.js', weight: 5 },
        { name: 'TypeScript', weight: 4 },
        { name: 'SSR', weight: 4 },
      ],
      [
        { name: 'Firebase', weight: 2 },
        { name: 'Testing Library', weight: 2 },
        { name: 'MUI', weight: 1 },
      ],
    ),
    salaryMin: 1800,
    salaryMax: 2500,
    status: 'open',
    hiringManagerId: 'hr-demo-01',
    publishedAt: PUBLISHED_AT,
    responsabilities: [
      'Desarrollar componentes React con SSR usando Next.js',
      'Optimizar rendimiento de aplicaciones web',
      'Colaborar con diseño en implementación de interfaces',
    ],
    benefits: ['Home office', 'Horario flexible', 'Capacitación continua'],
  }),
  buildJob('backend-firebase-developer', {
    title: 'Backend Firebase Developer',
    department: 'Engineering',
    seniority: 'senior',
    location: 'remote',
    description:
      'Rol orientado a Cloud Functions, Firestore y diseño de servicios backend para soportar flujos ATS.',
    skills: buildSkills(
      [
        { name: 'Node.js', weight: 5 },
        { name: 'TypeScript', weight: 4 },
        { name: 'Firebase Functions', weight: 5 },
        { name: 'Firestore', weight: 4 },
      ],
      [
        { name: 'OpenAI API', weight: 2 },
        { name: 'Vitest', weight: 2 },
        { name: 'Emulator Suite', weight: 2 },
      ],
    ),
    salaryMin: 2000,
    salaryMax: 2800,
    status: 'open',
    hiringManagerId: 'hr-demo-02',
    publishedAt: PUBLISHED_AT,
    responsabilities: [
      'Diseñar y desarrollar Cloud Functions',
      'Gestionar base de datos Firestore',
      'Implementar servicios backend escalables',
    ],
    benefits: ['Home office total', 'Flexible schedule', 'Learning budget'],
  }),
  buildJob('technical-recruiter', {
    title: 'Technical Recruiter',
    department: 'Talent Acquisition',
    seniority: 'senior',
    location: 'hybrid',
    city: 'Buenos Aires',
    description:
      'Posición para gestionar búsquedas IT, screening inicial y coordinación con líderes técnicos.',
    skills: buildSkills(
      [
        { name: 'Reclutamiento IT', weight: 5 },
        { name: 'Entrevistas iniciales', weight: 4 },
        { name: 'Seguimiento de pipeline', weight: 4 },
      ],
      [
        { name: 'ATS', weight: 2 },
        { name: 'LinkedIn Recruiter', weight: 2 },
      ],
    ),
    salaryMin: 1500,
    salaryMax: 2200,
    status: 'open',
    hiringManagerId: 'hr-demo-03',
    publishedAt: PUBLISHED_AT,
    responsabilities: [
      'Gestionar búsquedas IT',
      'Screening de candidatos',
      'Coordinación con líderes técnicos',
    ],
    benefits: ['Oficina en Buenos Aires', 'Flexibilidad horaria', 'Bonos'],
  }),
  buildJob('qa-automation-analyst', {
    title: 'QA Automation Analyst',
    department: 'Quality Assurance',
    seniority: 'semi-senior',
    location: 'remote',
    description:
      'Perfil QA con experiencia en automatización, armado de suites de prueba y validación de flujos críticos.',
    skills: buildSkills(
      [
        { name: 'Testing funcional', weight: 4 },
        { name: 'Automatización', weight: 5 },
        { name: 'APIs', weight: 3 },
      ],
      [
        { name: 'Playwright', weight: 3 },
        { name: 'Cypress', weight: 2 },
        { name: 'CI/CD', weight: 2 },
      ],
    ),
    salaryMin: 1700,
    salaryMax: 2400,
    status: 'paused',
    hiringManagerId: 'hr-demo-04',
    responsabilities: [
      'Desarrollar suites de automatización',
      'Validar flujos críticos',
      'Reportar defectos',
    ],
    benefits: ['Home office', 'Horario flexible', 'Testing tools'],
  }),
  buildJob('ux-ui-designer', {
    title: 'UX/UI Designer',
    department: 'Product Design',
    seniority: 'semi-senior',
    location: 'hybrid',
    city: 'Cordoba',
    description:
      'Diseño de experiencias de producto con foco en claridad operativa, handoff a desarrollo y consistencia visual.',
    skills: buildSkills(
      [
        { name: 'Figma', weight: 5 },
        { name: 'Diseño UX', weight: 4 },
        { name: 'Diseño UI', weight: 4 },
      ],
      [
        { name: 'Research', weight: 2 },
        { name: 'Prototipado', weight: 2 },
        { name: 'Accesibilidad', weight: 1 },
      ],
    ),
    salaryMin: 1600,
    salaryMax: 2300,
    status: 'draft',
    hiringManagerId: 'hr-demo-05',
    responsabilities: [
      'Diseñar interfaces de usuario',
      'Crear prototipos en Figma',
      'Colaborar con product y desarrollo',
    ],
    benefits: ['Oficina en Córdoba', 'Flexibilidad horaria', 'Mentoring'],
  }),
];

export class SeedJobsService {
  constructor(private readonly jobsRepository = new JobsRepository()) {}

  async seedJobs(): Promise<SeedJobsResult> {
    try {
      let created = 0;
      let updated = 0;

      for (const seed of JOB_SEEDS) {
        const result = await this.jobsRepository.createOrUpdateJob(
          seed.id,
          seed.data,
        );

        if (result === 'created') {
          created += 1;
        } else {
          updated += 1;
        }
      }

      return {
        processed: JOB_SEEDS.length,
        created,
        updated,
        jobIds: JOB_SEEDS.map((job) => job.id),
      };
    } catch (error) {
      throw new SeedJobsServiceError(
        'No se pudieron cargar las semillas de puestos.',
        error,
      );
    }
  }
}
