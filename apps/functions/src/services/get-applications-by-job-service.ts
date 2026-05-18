import type {
  Application,
  ApplicationWithCandidateDTO,
  GetApplicationsByJobResponse,
  QueryOptions,
} from '@ats/shared-types';

import { ApplicationsRepository } from '../repositories/application-repository';
import { JobsRepository } from '../repositories/jobs-repository';

export class JobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`La posición ${jobId} no existe.`);
    this.name = 'JobNotFoundError';
  }
}

export class GetApplicationsByJobServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GetApplicationsByJobServiceError';
  }
}

export class GetApplicationsByJobService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository = new ApplicationsRepository(),
    private readonly jobsRepository: JobsRepository = new JobsRepository(),
  ) {}

  async getApplicationsByJob(
    jobId: string,
    options?: QueryOptions,
  ): Promise<GetApplicationsByJobResponse> {
    try {
      const job = await this.jobsRepository.findById(jobId);

      if (!job) {
        throw new JobNotFoundError(jobId);
      }

      const applications = await this.applicationsRepository.findByJobId(
        jobId,
        options,
      );

      return applications.map(this.toApplicationWithCandidateDTO);
    } catch (error) {
      if (error instanceof JobNotFoundError) {
        throw error;
      }

      throw new GetApplicationsByJobServiceError(
        `No se pudieron obtener las postulaciones para jobId=${jobId}.`,
        error,
      );
    }
  }

  private toApplicationWithCandidateDTO(
    application: Application,
  ): ApplicationWithCandidateDTO {
    return {
      id: application.id,
      jobId: application.jobId,
      candidateId: application.candidateId,
      stage: application.stage,
      status: application.status,
      fitScore: application.fitScore,
      fitSummary: application.fitSummary,
      coverLetter: application.coverLetter,
      candidateName: application.candidateName,
      candidateEmail: application.candidateEmail,
      notes: application.notes,
      rejectionReason: application.rejectionReason,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      stageUpdatedAt: application.stageUpdatedAt,
    };
  }
}
