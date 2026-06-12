import type {
  ApplicationStage,
  GetApplicationsByJobResponse,
  QueryOptions,
  UpdateApplicationStageResponse,
} from '@ats/shared-types';

import type { IApplicationRepository } from '../../repositories/interfaces/application.repository';

export class PipelineServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PipelineServiceError';
  }
}

export class PipelineService {
  constructor(private readonly repo: IApplicationRepository) { }

  async getCandidatesByJob(
    jobId: string,
    options?: QueryOptions,
  ): Promise<GetApplicationsByJobResponse> {
    try {
      return await this.repo.getApplicationsByJob({
        jobId,
        orderBy: options?.orderBy ?? 'fitScore',
        orderDirection: options?.orderDirection ?? 'desc',
        limit: options?.limit,
      });
    } catch (error) {
      throw new PipelineServiceError(
        'No se pudieron obtener los candidatos de la posición.',
        error,
      );
    }
  }

  async updateApplicationStage(
    applicationId: string,
    stage: ApplicationStage,
    notes?: string,
  ): Promise<UpdateApplicationStageResponse> {
    try {
      return await this.repo.updateApplicationStage({
        applicationId,
        stage,
        ...(notes !== undefined && { notes }),
      });
    } catch (error) {
      throw new PipelineServiceError(
        'No se pudo actualizar la etapa de la postulación.',
        error,
      );
    }
  }

  async discardApplication(
    applicationId: string,
    rejectionReason: string,
  ): Promise<UpdateApplicationStageResponse> {
    try {
      return await this.repo.updateApplicationStage({
        applicationId,
        stage: 'rejected',
        rejectionReason,
      });
    } catch (error) {
      throw new PipelineServiceError(
        'No se pudo descartar la postulación.',
        error,
      );
    }
  }
}
