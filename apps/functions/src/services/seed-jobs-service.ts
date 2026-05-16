import type { JobLocation, JobStatus } from '@ats/shared-types';

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

function buildJob(
  id: string,
  overrides: Partial<SeedJobInput> & {
    title: string;
    department: string;
    location: JobLocation;
    description: string;
    requirements: string[];
    hiringManagerId: string;
    status: JobStatus;
  },
): SeedJobDefinition {
  return {
    id,
    data: {
      currency: 'USD',
      ...overrides,
    },
  };
}

const JOB_SEEDS: SeedJobDefinition[] = [
  buildJob('frontend-ssr-developer', {
    title: 'Frontend SSR Developer',
    department: 'Engineering',
    location: 'remote',
    description:
      'Buscamos un perfil frontend con foco en SSR, experiencia en React y buen criterio para interfaces de producto.',
    requirements: ['React', 'Next.js', 'TypeScript', 'SSR', 'Consumo de APIs'],
    niceToHave: ['Firebase', 'Testing Library', 'MUI'],
    salaryMin: 1800,
    salaryMax: 2500,
    status: 'open',
    hiringManagerId: 'hr-demo-01',
    publishedAt: PUBLISHED_AT,
  }),
  buildJob('backend-firebase-developer', {
    title: 'Backend Firebase Developer',
    department: 'Engineering',
    location: 'remote',
    description:
      'Rol orientado a Cloud Functions, Firestore y diseño de servicios backend para soportar flujos ATS.',
    requirements: [
      'Node.js',
      'TypeScript',
      'Firebase Functions',
      'Firestore',
      'Arquitectura por capas',
    ],
    niceToHave: ['OpenAI API', 'Vitest', 'Emulator Suite'],
    salaryMin: 2000,
    salaryMax: 2800,
    status: 'open',
    hiringManagerId: 'hr-demo-02',
    publishedAt: PUBLISHED_AT,
  }),
  buildJob('technical-recruiter', {
    title: 'Technical Recruiter',
    department: 'Talent Acquisition',
    location: 'hybrid',
    city: 'Buenos Aires',
    description:
      'Posición para gestionar búsquedas IT, screening inicial y coordinación con líderes técnicos.',
    requirements: [
      'Reclutamiento IT',
      'Entrevistas iniciales',
      'Seguimiento de pipeline',
      'Comunicación con hiring managers',
    ],
    niceToHave: ['ATS', 'LinkedIn Recruiter'],
    salaryMin: 1500,
    salaryMax: 2200,
    status: 'open',
    hiringManagerId: 'hr-demo-03',
    publishedAt: PUBLISHED_AT,
  }),
  buildJob('qa-automation-analyst', {
    title: 'QA Automation Analyst',
    department: 'Quality Assurance',
    location: 'remote',
    description:
      'Perfil QA con experiencia en automatización, armado de suites de prueba y validación de flujos críticos.',
    requirements: [
      'Testing funcional',
      'Automatización',
      'APIs',
      'Casos de prueba',
    ],
    niceToHave: ['Playwright', 'Cypress', 'CI/CD'],
    salaryMin: 1700,
    salaryMax: 2400,
    status: 'paused',
    hiringManagerId: 'hr-demo-04',
  }),
  buildJob('ux-ui-designer', {
    title: 'UX/UI Designer',
    department: 'Product Design',
    location: 'hybrid',
    city: 'Cordoba',
    description:
      'Diseño de experiencias de producto con foco en claridad operativa, handoff a desarrollo y consistencia visual.',
    requirements: ['Figma', 'Diseño UX', 'Diseño UI', 'Design systems'],
    niceToHave: ['Research', 'Prototipado', 'Accesibilidad'],
    salaryMin: 1600,
    salaryMax: 2300,
    status: 'draft',
    hiringManagerId: 'hr-demo-05',
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
