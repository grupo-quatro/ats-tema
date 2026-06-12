import type {
  ApplicationDetailDTO,
  ApplicationDetailCandidateDTO,
} from '@ats/shared-types';

import { ApplicationsRepository } from '../repositories/applicationRepository';
import { CandidatesRepository } from '../repositories/candidateRepository';
import { JobsRepository } from '../repositories/jobRepository';

// ─── Errores ──────────────────────────────────────────────────────────────────

export class ApplicationDetailNotFoundError extends Error {
  constructor(applicationId: string) {
    super(`La postulación ${applicationId} no existe.`);
    this.name = 'ApplicationDetailNotFoundError';
  }
}

export class ApplicationDetailServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ApplicationDetailServiceError';
  }
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export class GetApplicationDetailService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository = new ApplicationsRepository(),
    private readonly candidatesRepository: CandidatesRepository = new CandidatesRepository(),
    private readonly jobsRepository: JobsRepository = new JobsRepository(),
  ) {}

  async getApplicationDetail(
    applicationId: string,
  ): Promise<ApplicationDetailDTO> {
    // ── 1. Leer la postulación ─────────────────────────────────────────────────
    const application =
      await this.applicationsRepository.findById(applicationId);

    if (!application) {
      throw new ApplicationDetailNotFoundError(applicationId);
    }

    // ── 2. Leer candidato y puesto en paralelo ─────────────────────────────────
    const [candidate, job] = await Promise.all([
      this.candidatesRepository.findById(application.candidateId),
      this.jobsRepository.findById(application.jobId),
    ]);

    // ── 3. Armar DTO consolidado ───────────────────────────────────────────────
    const candidateDTO: ApplicationDetailCandidateDTO = candidate
      ? {
          id: candidate.id,
          fullName: candidate.fullName,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
          phone: candidate.phone,
          location: candidate.location,
          yearsOfExperience: candidate.yearsOfExperience,
          education: candidate.education,
          technicalSkills: candidate.technicalSkills,
          professionalSummary: candidate.professionalSummary,
          parsedExperience: candidate.parsedCv?.experience,
          parsedEducation: candidate.parsedCv?.education,
          cvStoragePath: candidate.cvStoragePath ?? null,
        }
      : {
          // Fallback con los datos denormalizados en la postulación
          id: application.candidateId,
          fullName: application.candidateName,
          email: application.candidateEmail,
        };

    return {
      // — Postulación —
      id: application.id,
      stage: application.stage,
      status: application.status,
      fitScore: application.fitScore,
      skillMatchStats: application.skillMatchStats,
      notes: application.notes,
      coverLetter: application.coverLetter,
      rejectionReason: application.rejectionReason,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      stageUpdatedAt: application.stageUpdatedAt,

      // — Candidato —
      candidate: candidateDTO,

      // — Puesto —
      job: {
        id: application.jobId,
        title: job?.title ?? application.jobTitle ?? '',
        skills: job?.skills ?? [],
      },
    };
  }
}
