import type {
  CreateApplicationDTO,
  SubmitApplicationResponse,
} from '@ats/shared-types';

import { auth } from '../core/firebaseAdmin';
import { ApplicationsRepository } from '../repositories/applicationRepository';
import { CandidatesRepository } from '../repositories/candidateRepository';
import { JobsRepository } from '../repositories/jobRepository';
import {
  ApplicationAlreadyExistsError,
  CandidateNotFoundError,
  JobNotFoundError,
  JobNotOpenError,
  SubmitApplicationError,
} from './submitApplicationErrors';

export class SubmitApplicationService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository = new ApplicationsRepository(),
    private readonly candidatesRepository: CandidatesRepository = new CandidatesRepository(),
    private readonly jobsRepository: JobsRepository = new JobsRepository(),
  ) {}

  async submitApplication(
    candidateId: string,
    jobId: string,
  ): Promise<SubmitApplicationResponse> {
    try {
      await this.validateCandidateExists(candidateId);
      await this.validateJobOpenForApplications(jobId);
      await this.validateNoDuplicateApplication(candidateId, jobId);

      const applicationId = await this.createApplication(candidateId, jobId);

      return {
        applicationId,
        candidateId,
        jobId,
        stage: 'applied',
        status: 'active',
      };
    } catch (error) {
      if (
        error instanceof CandidateNotFoundError ||
        error instanceof JobNotFoundError ||
        error instanceof JobNotOpenError ||
        error instanceof ApplicationAlreadyExistsError
      ) {
        throw error;
      }

      throw new SubmitApplicationError(
        `No se pudo registrar la postulación del candidato ${candidateId} para la posición ${jobId}.`,
        error,
      );
    }
  }

  private async validateCandidateExists(candidateId: string): Promise<void> {
    const candidate = await this.candidatesRepository.findById(candidateId);

    if (!candidate) {
      throw new CandidateNotFoundError(candidateId);
    }
  }

  private async validateJobOpenForApplications(jobId: string): Promise<void> {
    const job = await this.jobsRepository.findById(jobId);

    if (!job) {
      throw new JobNotFoundError(jobId);
    }

    if (job.status !== 'open') {
      throw new JobNotOpenError(jobId);
    }
  }

  private async validateNoDuplicateApplication(
    candidateId: string,
    jobId: string,
  ): Promise<void> {
    const existingApplication =
      await this.applicationsRepository.findByCandidateAndJob(
        candidateId,
        jobId,
      );

    if (existingApplication) {
      throw new ApplicationAlreadyExistsError(candidateId, jobId);
    }
  }

  private async createApplication(
    candidateId: string,
    jobId: string,
  ): Promise<string> {
    const applicationData: CreateApplicationDTO = {
      candidateId,
      jobId,
      stage: 'applied',
      status: 'active',
    };

    const [applicationId, userRecord] = await Promise.all([
      this.applicationsRepository.create(applicationData),
      auth.getUser(candidateId).catch(() => null),
    ]);

    await this.applicationsRepository.addStageHistoryEntry(applicationId, {
      stage: 'applied',
      changedBy: candidateId,
      changedByEmail: userRecord?.email ?? candidateId,
    });

    return applicationId;
  }
}
