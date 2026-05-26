import type {
  ApplicationStage,
  ApplicationStatus,
  CreateApplicationDTO,
  CreateCandidateDTO,
} from '@ats/shared-types';

import { ApplicationsRepository } from '../repositories/application-repository';
import { CandidatesRepository } from '../repositories/candidateRepository';

type SeedCandidateDefinition = {
  id: string;
  data: CreateCandidateDTO;
};

type SeedApplicationDefinition = {
  candidateId: string;
  jobId: string;
  stage: ApplicationStage;
  status: ApplicationStatus;
  fitScore?: number;
  fitSummary?: string;
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
  },
];

// Distribuye candidatos en distintas etapas del pipeline para los jobs del seeder
const APPLICATION_SEEDS: SeedApplicationDefinition[] = [
  // frontend-ssr-developer — candidatos en distintas etapas
  {
    candidateId: 'seed-candidate-01',
    jobId: 'frontend-ssr-developer',
    stage: 'interview_2_done',
    status: 'active',
    fitScore: 91,
    fitSummary:
      'Perfil muy alineado. Domina Next.js con SSR y tiene experiencia en Firebase.',
    notes: 'Segunda entrevista excelente. Recomendar oferta.',
  },
  {
    candidateId: 'seed-candidate-02',
    jobId: 'frontend-ssr-developer',
    stage: 'interview_1_done',
    status: 'active',
    fitScore: 74,
    fitSummary: 'Buen manejo de React y TypeScript. SSR con menos profundidad.',
    notes: 'Pasar a segunda entrevista técnica.',
  },
  {
    candidateId: 'seed-candidate-07',
    jobId: 'frontend-ssr-developer',
    stage: 'cv_submitted',
    status: 'active',
    fitScore: 58,
    fitSummary: 'Perfil junior con base sólida. Falta experiencia en SSR.',
  },
  {
    candidateId: 'seed-candidate-04',
    jobId: 'frontend-ssr-developer',
    stage: 'rejected',
    status: 'rejected',
    fitScore: 32,
    fitSummary: 'Perfil backend, no aplica para esta posición.',
    rejectionReason: 'Stack no alineado con el rol frontend.',
  },

  // backend-firebase-developer — candidatos en distintas etapas
  {
    candidateId: 'seed-candidate-04',
    jobId: 'backend-firebase-developer',
    stage: 'offer_sent',
    status: 'active',
    fitScore: 95,
    fitSummary:
      'Perfil ideal. Senior con experiencia directa en Firebase Functions y OpenAI.',
    notes: 'Oferta enviada. Esperando respuesta.',
  },
  {
    candidateId: 'seed-candidate-03',
    jobId: 'backend-firebase-developer',
    stage: 'interview_1_scheduled',
    status: 'active',
    fitScore: 80,
    fitSummary:
      'Sólido en Node.js y Firestore. No tiene experiencia con OpenAI API.',
  },
  {
    candidateId: 'seed-candidate-08',
    jobId: 'backend-firebase-developer',
    stage: 'screening',
    status: 'active',
    fitScore: 88,
    fitSummary:
      'Senior con amplia trayectoria. Referente en arquitectura serverless con Firebase.',
  },

  // technical-recruiter — candidatos en distintas etapas
  {
    candidateId: 'seed-candidate-05',
    jobId: 'technical-recruiter',
    stage: 'hired',
    status: 'hired',
    fitScore: 87,
    fitSummary: 'Experiencia exacta para el rol. Proceso exitoso.',
    notes: 'Incorporación acordada para el 01/06.',
  },
  {
    candidateId: 'seed-candidate-01',
    jobId: 'technical-recruiter',
    stage: 'withdrawn',
    status: 'withdrawn',
    fitScore: 45,
    fitSummary: 'Perfil más técnico que de RRHH.',
    rejectionReason: 'Candidata retiró su postulación.',
  },

  // qa-automation-analyst — candidatos en distintas etapas
  {
    candidateId: 'seed-candidate-06',
    jobId: 'qa-automation-analyst',
    stage: 'interview_2_scheduled',
    status: 'active',
    fitScore: 83,
    fitSummary:
      'Buen perfil QA con Playwright y Cypress. Experiencia en fintech.',
  },
  {
    candidateId: 'seed-candidate-02',
    jobId: 'qa-automation-analyst',
    stage: 'applied',
    status: 'active',
    fitScore: 51,
    fitSummary: 'Perfil frontend con algo de testing. No es QA de carrera.',
  },
];

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
            ...(appSeed.fitSummary !== undefined && {
              fitSummary: appSeed.fitSummary,
            }),
            ...(appSeed.notes !== undefined && { notes: appSeed.notes }),
            ...(appSeed.rejectionReason !== undefined && {
              rejectionReason: appSeed.rejectionReason,
            }),
          };

          await this.applicationsRepository.create(dto);
          applicationsCreated += 1;
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
