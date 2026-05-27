import type {
  ApplicationStage,
  ApplicationStatus,
  CreateApplicationDTO,
} from '@ats/shared-types';

import { auth } from '../core/firebaseAdmin';
import { ApplicationsRepository } from '../repositories/applicationRepository';
import { CandidatesRepository } from '../repositories/candidateRepository';

export type ApplicationRegistrationSource = 'manual' | 'cv_upload';

export class ApplicationRegistrationServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ApplicationRegistrationServiceError';
  }
}

export class ApplicationRegistrationService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository = new ApplicationsRepository(),
    private readonly candidatesRepository: CandidatesRepository = new CandidatesRepository(),
  ) {}

  async createApplicationForCandidate(
    candidateId: string,
    jobId: string,
    source: ApplicationRegistrationSource,
  ): Promise<string> {
    try {
      const existingApplication =
        await this.applicationsRepository.findByCandidateAndJob(
          candidateId,
          jobId,
        );

      if (existingApplication) {
        return existingApplication.id;
      }

      const candidate = await this.candidatesRepository.findById(candidateId);

      if (!candidate) {
        throw new ApplicationRegistrationServiceError(
          `No se encontró el candidato ${candidateId}.`,
        );
      }

      //en el flujo CV directo, si primero creás un candidate draft sin nombre/email por eso estan opcionales
      const stage = this.resolveInitialStage(source);
      const applicationData: CreateApplicationDTO = {
        jobId,
        candidateId,
        status: this.resolveInitialStatus(source),
        stage,
      };

      if (candidate.fullName) {
        applicationData.candidateName = candidate.fullName;
      }

      if (candidate.email) {
        applicationData.candidateEmail = candidate.email;
      }

      const [applicationId, userRecord] = await Promise.all([
        this.applicationsRepository.create(applicationData),
        auth.getUser(candidateId).catch(() => null),
      ]);

      await this.applicationsRepository.addStageHistoryEntry(applicationId, {
        stage,
        changedBy: candidateId,
        changedByEmail: userRecord?.email ?? candidateId,
      });

      return applicationId;
    } catch (error) {
      if (error instanceof ApplicationRegistrationServiceError) {
        throw error;
      }

      throw new ApplicationRegistrationServiceError(
        `No se pudo crear la postulación para candidateId=${candidateId} y jobId=${jobId}.`,
        error,
      );
    }
  }

  private resolveInitialStatus(
    source: ApplicationRegistrationSource,
  ): ApplicationStatus {
    return source === 'manual' ? 'active' : 'draft';
  }

  private resolveInitialStage(
    source: ApplicationRegistrationSource,
  ): ApplicationStage {
    return source === 'manual' ? 'applied' : 'profile_pending';
  }
}
