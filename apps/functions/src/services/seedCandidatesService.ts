import type {
  ApplicationStage,
  ApplicationStatus,
  Candidate,
  CreateApplicationDTO,
  CreateCandidateDTO,
  CreateStageHistoryEntryDTO,
} from '@ats/shared-types';
import { PIPELINE_ORDER, STAGE_CONFIG } from '@ats/shared-types';

import { ApplicationsRepository } from '../repositories/applicationRepository';
import { CandidatesRepository } from '../repositories/candidateRepository';

type SeedCandidateDefinition = {
  id: string;
  data: CreateCandidateDTO;
  parsedCv?: Candidate['parsedCv'];
};

type SeedApplicationDefinition = {
  candidateId: string;
  jobId: string;
  stage: ApplicationStage;
  status: ApplicationStatus;
  fitScore?: number;
  notes?: string;
  rejectionReason?: string;
};

export type SeedCandidatesResult = {
  candidatesCreated: number;
  candidatesUpdated: number;
  applicationsCreated: number;
  applicationsFailed: number;
};

export class SeedCandidatesServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SeedCandidatesServiceError';
  }
}

const CANDIDATE_SEEDS: SeedCandidateDefinition[] = [
  {
    id: 'seed-candidate-01',
    data: {
      firstName: 'Valentina',
      lastName: 'Rossi',
      fullName: 'Valentina Rossi',
      email: 'valentina.rossi@example.com',
      phone: '+54 11 2345-6789',
      location: 'Buenos Aires, Argentina',
      yearsOfExperience: 5,
      education: 'Licenciatura en Sistemas, UBA',
      technicalSkills: ['React', 'Next.js', 'TypeScript', 'SSR', 'Firebase'],
      professionalSummary:
        'Frontend developer con foco en SSR y performance. Experiencia en productos de escala media-alta.',
      profileStatus: 'completed',
      registrationType: 'specific',
      registrationSource: 'cv_upload',
      cvParseStatus: 'done',
    },
    parsedCv: {
      experience: [
        {
          role: 'Frontend Developer Senior',
          company: 'Mercado Libre',
          startDate: 'Mar 2022',
          endDate: 'Actualidad',
          description:
            'Desarrollo de micro-frontends con Next.js y SSR. Optimización de Core Web Vitals.',
        },
        {
          role: 'Frontend Developer',
          company: 'Despegar',
          startDate: 'Ene 2020',
          endDate: 'Feb 2022',
          description:
            'Implementación de landing pages y flujos de checkout con React y TypeScript.',
        },
      ],
      education: [
        {
          degree: 'Licenciatura en Sistemas',
          institution: 'Universidad de Buenos Aires (UBA)',
          startDate: '2015',
          endDate: '2020',
        },
      ],
    },
  },
  {
    id: 'seed-candidate-02',
    data: {
      firstName: 'Mateo',
      lastName: 'Fernández',
      fullName: 'Mateo Fernández',
      email: 'mateo.fernandez@example.com',
      phone: '+54 11 3456-7890',
      location: 'Córdoba, Argentina',
      yearsOfExperience: 3,
      education: 'Ingeniería en Computación, UTN',
      technicalSkills: ['React', 'Next.js', 'TypeScript', 'MUI'],
      professionalSummary:
        'Desarrollador frontend semi-senior con experiencia en aplicaciones B2B.',
      profileStatus: 'completed',
      registrationType: 'specific',
      registrationSource: 'manual',
      cvParseStatus: 'not_required',
    },
  },
  {
    id: 'seed-candidate-03',
    data: {
      firstName: 'Lucía',
      lastName: 'Gómez',
      fullName: 'Lucía Gómez',
      email: 'lucia.gomez@example.com',
      phone: '+54 11 4567-8901',
      location: 'Rosario, Argentina',
      yearsOfExperience: 4,
      education: 'Analista en Sistemas, UADE',
      technicalSkills: [
        'Node.js',
        'TypeScript',
        'Firebase Functions',
        'Firestore',
      ],
      professionalSummary:
        'Backend developer con foco en Cloud Functions y arquitectura serverless.',
      profileStatus: 'completed',
      registrationType: 'specific',
      registrationSource: 'cv_upload',
      cvParseStatus: 'done',
    },
    parsedCv: {
      experience: [
        {
          role: 'Backend Developer',
          company: 'Naranja X',
          startDate: 'Jun 2022',
          endDate: 'Actualidad',
          description:
            'Diseño e implementación de Cloud Functions para procesamiento de pagos. Arquitectura serverless en Firebase.',
        },
        {
          role: 'Desarrolladora Node.js',
          company: 'Snoop Consulting',
          startDate: 'Mar 2020',
          endDate: 'May 2022',
          description:
            'APIs REST con Node.js y TypeScript. Integración con bases de datos NoSQL.',
        },
      ],
      education: [
        {
          degree: 'Analista en Sistemas',
          institution: 'UADE',
          startDate: '2016',
          endDate: '2020',
        },
      ],
    },
  },
  {
    id: 'seed-candidate-04',
    data: {
      firstName: 'Sebastián',
      lastName: 'Torres',
      fullName: 'Sebastián Torres',
      email: 'sebastian.torres@example.com',
      phone: '+54 11 5678-9012',
      location: 'Buenos Aires, Argentina',
      yearsOfExperience: 6,
      education: 'Ingeniería en Software, ITBA',
      technicalSkills: [
        'Node.js',
        'TypeScript',
        'Firebase Functions',
        'OpenAI API',
        'Vitest',
      ],
      professionalSummary:
        'Senior backend engineer con experiencia en integraciones de IA y diseño de servicios escalables.',
      profileStatus: 'completed',
      registrationType: 'specific',
      registrationSource: 'cv_upload',
      cvParseStatus: 'done',
    },
    parsedCv: {
      experience: [
        {
          role: 'Senior Backend Engineer',
          company: 'Ualá',
          startDate: 'Ago 2021',
          endDate: 'Actualidad',
          description:
            'Integración de OpenAI API para scoring automático de solicitudes de crédito. Diseño de pipelines serverless con Firebase Functions.',
        },
        {
          role: 'Backend Developer',
          company: 'Globant',
          startDate: 'Feb 2019',
          endDate: 'Jul 2021',
          description:
            'Desarrollo de microservicios con Node.js y TypeScript para cliente del sector financiero.',
        },
        {
          role: 'Desarrollador Node.js',
          company: 'MercadoLibre',
          startDate: 'Ene 2018',
          endDate: 'Ene 2019',
          description:
            'Mantenimiento y evolución de servicios de notificaciones.',
        },
      ],
      education: [
        {
          degree: 'Ingeniería en Software',
          institution: 'ITBA',
          startDate: '2013',
          endDate: '2018',
        },
      ],
    },
  },
  {
    id: 'seed-candidate-05',
    data: {
      firstName: 'Camila',
      lastName: 'Herrera',
      fullName: 'Camila Herrera',
      email: 'camila.herrera@example.com',
      phone: '+54 11 6789-0123',
      location: 'Buenos Aires, Argentina',
      yearsOfExperience: 4,
      education: 'Licenciatura en RRHH, UBA',
      technicalSkills: [
        'Reclutamiento IT',
        'Entrevistas',
        'LinkedIn Recruiter',
        'ATS',
      ],
      professionalSummary:
        'Technical recruiter con foco en perfiles tech. Experiencia en startups y consultoras.',
      profileStatus: 'completed',
      registrationType: 'specific',
      registrationSource: 'manual',
      cvParseStatus: 'not_required',
    },
  },
  {
    id: 'seed-candidate-06',
    data: {
      firstName: 'Nicolás',
      lastName: 'Martínez',
      fullName: 'Nicolás Martínez',
      email: 'nicolas.martinez@example.com',
      phone: '+54 11 7890-1234',
      location: 'Mendoza, Argentina',
      yearsOfExperience: 3,
      education: 'Ingeniería en Sistemas, UNCuyo',
      technicalSkills: [
        'Testing funcional',
        'Automatización',
        'Playwright',
        'Cypress',
      ],
      professionalSummary:
        'QA automation analyst con experiencia en proyectos fintech.',
      profileStatus: 'completed',
      registrationType: 'specific',
      registrationSource: 'cv_upload',
      cvParseStatus: 'done',
    },
    parsedCv: {
      experience: [
        {
          role: 'QA Automation Analyst',
          company: 'Brubank',
          startDate: 'Mar 2023',
          endDate: 'Actualidad',
          description:
            'Diseño de suite de pruebas E2E con Playwright para app móvil fintech. Integración con CI/CD en GitHub Actions.',
        },
        {
          role: 'QA Engineer',
          company: 'Practia',
          startDate: 'Jun 2021',
          endDate: 'Feb 2023',
          description:
            'Testing funcional y automatización con Cypress en proyectos de banca digital.',
        },
      ],
      education: [
        {
          degree: 'Ingeniería en Sistemas',
          institution: 'UNCuyo',
          startDate: '2016',
          endDate: '2021',
        },
      ],
    },
  },
  {
    id: 'seed-candidate-07',
    data: {
      firstName: 'Ana',
      lastName: 'López',
      fullName: 'Ana López',
      email: 'ana.lopez@example.com',
      phone: '+54 11 8901-2345',
      location: 'Buenos Aires, Argentina',
      yearsOfExperience: 2,
      education: 'Diseño Gráfico, UBA',
      technicalSkills: ['React', 'Next.js', 'TypeScript'],
      professionalSummary:
        'Desarrolladora frontend junior con perfil de diseño, foco en interfaces de producto.',
      profileStatus: 'draft',
      registrationType: 'specific',
      registrationSource: 'cv_upload',
      cvParseStatus: 'pending',
    },
  },
  {
    id: 'seed-candidate-08',
    data: {
      firstName: 'Diego',
      lastName: 'Ruiz',
      fullName: 'Diego Ruiz',
      email: 'diego.ruiz@example.com',
      phone: '+54 11 9012-3456',
      location: 'Buenos Aires, Argentina',
      yearsOfExperience: 7,
      education: 'Ingeniería en Sistemas, UBA',
      technicalSkills: [
        'Node.js',
        'TypeScript',
        'Firestore',
        'Firebase Functions',
        'Emulator Suite',
      ],
      professionalSummary:
        'Backend senior con larga trayectoria en Firebase. Referente en arquitectura serverless.',
      profileStatus: 'completed',
      registrationType: 'specific',
      registrationSource: 'cv_upload',
      cvParseStatus: 'done',
    },
    parsedCv: {
      experience: [
        {
          role: 'Tech Lead Backend',
          company: 'Telecom Argentina',
          startDate: 'Ene 2020',
          endDate: 'Actualidad',
          description:
            'Liderazgo técnico de equipo de 4 desarrolladores. Migración de arquitectura monolítica a Firebase serverless.',
        },
        {
          role: 'Firebase Developer',
          company: 'Accenture',
          startDate: 'Mar 2017',
          endDate: 'Dic 2019',
          description:
            'Implementación de soluciones Firebase para clientes enterprise. Firestore, Functions y Emulator Suite.',
        },
        {
          role: 'Backend Developer',
          company: 'Freelance',
          startDate: 'Jun 2015',
          endDate: 'Feb 2017',
          description: 'Desarrollo de APIs y backends para startups locales.',
        },
      ],
      education: [
        {
          degree: 'Ingeniería en Sistemas',
          institution: 'Universidad de Buenos Aires (UBA)',
          startDate: '2010',
          endDate: '2015',
        },
      ],
    },
  },
];

// Distribuye candidatos en distintas etapas del pipeline para los jobs del seeder
const APPLICATION_SEEDS: SeedApplicationDefinition[] = [
  // frontend-ssr-developer — candidatos en distintas etapas
  {
    candidateId: 'seed-candidate-01',
    jobId: 'frontend-ssr-developer',
    stage: 'tech_1_done',
    status: 'active',
    fitScore: 91,
    notes: 'Entrevista técnica excelente. Recomendar oferta.',
  },
  {
    candidateId: 'seed-candidate-02',
    jobId: 'frontend-ssr-developer',
    stage: 'hr_1_done',
    status: 'active',
    fitScore: 74,
    notes: 'Pasar a segunda entrevista técnica.',
  },
  {
    candidateId: 'seed-candidate-07',
    jobId: 'frontend-ssr-developer',
    stage: 'cv_submitted',
    status: 'active',
    fitScore: 58,
  },
  {
    candidateId: 'seed-candidate-04',
    jobId: 'frontend-ssr-developer',
    stage: 'rejected',
    status: 'rejected',
    fitScore: 32,
    rejectionReason: 'Stack no alineado con el rol frontend.',
  },

  // backend-firebase-developer — candidatos en distintas etapas
  {
    candidateId: 'seed-candidate-04',
    jobId: 'backend-firebase-developer',
    stage: 'send_offer',
    status: 'active',
    fitScore: 95,
    notes: 'Oferta en preparación.',
  },
  {
    candidateId: 'seed-candidate-03',
    jobId: 'backend-firebase-developer',
    stage: 'schedule_hr_1',
    status: 'active',
    fitScore: 80,
  },
  {
    candidateId: 'seed-candidate-08',
    jobId: 'backend-firebase-developer',
    stage: 'screening',
    status: 'active',
    fitScore: 88,
  },

  // technical-recruiter — candidatos en distintas etapas
  {
    candidateId: 'seed-candidate-05',
    jobId: 'technical-recruiter',
    stage: 'hired',
    status: 'hired',
    fitScore: 87,
    notes: 'Incorporación acordada para el 01/06.',
  },
  {
    candidateId: 'seed-candidate-01',
    jobId: 'technical-recruiter',
    stage: 'withdrawn',
    status: 'withdrawn',
    fitScore: 45,
    rejectionReason: 'Candidata retiró su postulación.',
  },

  // qa-automation-analyst — candidatos en distintas etapas
  {
    candidateId: 'seed-candidate-06',
    jobId: 'qa-automation-analyst',
    stage: 'hr_2_done',
    status: 'active',
    fitScore: 83,
  },
  {
    candidateId: 'seed-candidate-02',
    jobId: 'qa-automation-analyst',
    stage: 'applied',
    status: 'active',
    fitScore: 51,
  },
];

/**
 * Construye la lista de stages que representan el historial completo
 * para llegar al targetStage dado.
 *
 * Para stages lineales: devuelve todos los stages desde 'applied'
 * (inclusive) hasta targetStage (inclusive), siguiendo PIPELINE_ORDER.
 *
 * Para jump stages (rejected, withdrawn): devuelve los stages lineales
 * hasta 'applied', más el jump stage al final (si es el target).
 *
 * profile_pending se omite del historial (es el estado pre-postulación).
 */
function buildStageHistoryPath(
  targetStage: ApplicationStage,
): ApplicationStage[] {
  const JUMP_STAGES: ApplicationStage[] = ['rejected', 'withdrawn'];

  const linearStages: ApplicationStage[] = PIPELINE_ORDER.filter(
    (s) => s !== 'profile_pending',
  );

  if (JUMP_STAGES.includes(targetStage)) {
    // Para jump stages, el historial lineal llega hasta 'applied' y luego el jump
    return ['applied', targetStage];
  }

  const targetIdx = linearStages.indexOf(targetStage);
  if (targetIdx === -1) {
    return [targetStage];
  }

  return linearStages.slice(0, targetIdx + 1);
}

export class SeedCandidatesService {
  constructor(
    private readonly candidatesRepository = new CandidatesRepository(),
    private readonly applicationsRepository = new ApplicationsRepository(),
  ) {}

  async seedCandidates(): Promise<SeedCandidatesResult> {
    try {
      let candidatesCreated = 0;
      let candidatesUpdated = 0;
      let applicationsCreated = 0;
      let applicationsFailed = 0;

      for (const seed of CANDIDATE_SEEDS) {
        const existing = await this.candidatesRepository.findById(seed.id);

        await this.candidatesRepository.createOrUpdateCandidate(
          seed.id,
          seed.data,
        );

        if (seed.parsedCv) {
          await this.candidatesRepository.update(seed.id, {
            parsedCv: seed.parsedCv,
          });
        }

        if (existing) {
          candidatesUpdated += 1;
        } else {
          candidatesCreated += 1;
        }
      }

      for (const appSeed of APPLICATION_SEEDS) {
        try {
          const existing =
            await this.applicationsRepository.findByCandidateAndJob(
              appSeed.candidateId,
              appSeed.jobId,
            );

          if (existing) {
            applicationsFailed += 1;
            continue;
          }

          const dto: CreateApplicationDTO = {
            jobId: appSeed.jobId,
            candidateId: appSeed.candidateId,
            stage: appSeed.stage,
            status: appSeed.status,
            ...(appSeed.fitScore !== undefined && {
              fitScore: appSeed.fitScore,
            }),
            ...(appSeed.notes !== undefined && { notes: appSeed.notes }),
            ...(appSeed.rejectionReason !== undefined && {
              rejectionReason: appSeed.rejectionReason,
            }),
          };

          const applicationId = await this.applicationsRepository.create(dto);
          applicationsCreated += 1;

          // Construir stageHistory completo para stages avanzados
          const historyPath = buildStageHistoryPath(appSeed.stage);

          // Solo crear historial si hay más de un stage (aplicaciones no en 'applied')
          // o si el stage actual tiene alguna configuración que lo justifique
          for (const historyStage of historyPath) {
            const entry: CreateStageHistoryEntryDTO = {
              stage: historyStage,
              changedBy: 'recruiter-dev',
              changedByEmail: 'recruiter@tema.dev',
              ...(historyStage === appSeed.stage && appSeed.notes
                ? { notes: appSeed.notes }
                : {}),
              ...(historyStage === appSeed.stage && appSeed.rejectionReason
                ? { rejectionReason: appSeed.rejectionReason }
                : {}),
            };
            await this.applicationsRepository.addStageHistoryEntry(
              applicationId,
              entry,
            );
          }
        } catch {
          applicationsFailed += 1;
        }
      }

      return {
        candidatesCreated,
        candidatesUpdated,
        applicationsCreated,
        applicationsFailed,
      };
    } catch (error) {
      throw new SeedCandidatesServiceError(
        'No se pudieron cargar las semillas de candidatos.',
        error,
      );
    }
  }
}
