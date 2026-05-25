import type {
  Application,
  ApplicationWithCandidateDTO,
  GetApplicationsByCandidateResponse,
} from '@ats/shared-types';

import { ApplicationsRepository } from '../repositories/application-repository';

export class GetApplicationsByCandidateServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GetApplicationsByCandidateServiceError';
  }
}

export class GetApplicationsByCandidateService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository = new ApplicationsRepository(),
  ) {}

  async getApplicationsByCandidate(
    candidateId: string,
    jobId?: string,
  ): Promise<GetApplicationsByCandidateResponse> {
    try {
      const applications = await this.applicationsRepository.findByCandidateId(
        candidateId,
        jobId,
      );

      return applications.map(this.toDTO);
    } catch (error) {
      throw new GetApplicationsByCandidateServiceError(
        `No se pudieron obtener las postulaciones para candidateId=${candidateId}.`,
        error,
      );
    }
  }

  private toDTO(application: Application): ApplicationWithCandidateDTO {
    return {
      id: application.id,
      jobId: application.jobId,
      candidateId: application.candidateId,
      stage: application.stage,
      status: application.status,
      fitScore: application.fitScore,
      fitSummary: application.fitSummary,
      coverLetter: application.coverLetter,
      skillMatchStats: application.skillMatchStats,
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
