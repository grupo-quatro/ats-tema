import type { Job } from '@ats/shared-types';

import { JobsRepository } from '../repositories/jobs-repository';

export class ListOpenJobsServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ListOpenJobsServiceError';
  }
}

export class ListOpenJobsService {
  constructor(
    private readonly jobsRepository: JobsRepository = new JobsRepository(),
  ) {}

  async listOpenJobs(): Promise<Job[]> {
    try {
      return await this.jobsRepository.findByStatus('open');
    } catch (error) {
      throw new ListOpenJobsServiceError(
        'No se pudieron obtener los puestos abiertos.',
        error,
      );
    }
  }
}
