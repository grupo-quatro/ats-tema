import type { Job } from '@ats/shared-types';

import { JobsRepository } from '../repositories/jobs-repository';

export class JobDetailValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JobDetailValidationError';
  }
}

export class JobDetailNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JobDetailNotFoundError';
  }
}

export class GetJobDetailServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GetJobDetailServiceError';
  }
}

export class GetJobDetailService {
  constructor(
    private readonly jobsRepository: JobsRepository = new JobsRepository(),
  ) {}

  async getJobDetail(jobId: string): Promise<Job> {
    try {
      const normalizedJobId = jobId?.trim();

      if (!normalizedJobId) {
        throw new JobDetailValidationError(
          'El jobId es obligatorio para obtener el detalle del puesto.',
        );
      }

      const job = await this.jobsRepository.findById(normalizedJobId);

      if (!job || job.status !== 'open') {
        throw new JobDetailNotFoundError(
          `No se encontró una vacante pública con id ${normalizedJobId}.`,
        );
      }

      return job;
    } catch (error) {
      if (
        error instanceof JobDetailValidationError ||
        error instanceof JobDetailNotFoundError
      ) {
        throw error;
      }

      throw new GetJobDetailServiceError(
        `No se pudo obtener el detalle del puesto ${jobId}.`,
        error,
      );
    }
  }
}
