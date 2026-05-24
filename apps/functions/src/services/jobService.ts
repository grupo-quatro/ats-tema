import { FieldValue } from 'firebase-admin/firestore';

import type {
  CreateJobDTO,
  CreateJobPayload,
  CreateJobResponse,
  GetInternalJobDetailResponse,
  Job,
  JobStatus,
  UpdateJobDTO,
  UpdatePositionPayload,
  UpdatePositionResponse,
  UpdatePositionStatusResponse,
} from '@ats/shared-types';

import { toSlug } from '../core/slug';
import { JobsRepository } from '../repositories/jobs-repository';

export class CreateJobServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CreateJobServiceError';
  }
}

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

export class InternalJobDetailValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InternalJobDetailValidationError';
  }
}

export class InternalJobDetailNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InternalJobDetailNotFoundError';
  }
}

export class GetInternalJobDetailServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GetInternalJobDetailServiceError';
  }
}

export class ListOpenJobsServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ListOpenJobsServiceError';
  }
}

export class JobUpdateNotFoundError extends Error {
  constructor(jobId: string) {
    super(`La posición ${jobId} no existe.`);
    this.name = 'JobUpdateNotFoundError';
  }
}

export class UpdateJobServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'UpdateJobServiceError';
  }
}

export class JobService {
  private static readonly DEFAULT_HIRING_MANAGER_ID = 'recruiter-dev';

  constructor(
    private readonly jobsRepository: JobsRepository = new JobsRepository(),
  ) {}

  async createJob(
    recruiterId: string | undefined,
    payload: CreateJobPayload,
  ): Promise<CreateJobResponse> {
    try {
      const status: JobStatus = payload.status ?? 'draft';
      const hiringManagerId =
        recruiterId ?? JobService.DEFAULT_HIRING_MANAGER_ID;
      const normalizedTitle = payload.title.trim();

      const jobData: CreateJobDTO = {
        title: normalizedTitle,
        slug: toSlug(normalizedTitle),
        department: payload.department.trim(),
        seniority: payload.seniority.trim(),
        location: payload.location,
        city: payload.city?.trim(),
        description: payload.description.trim(),
        skills: payload.skills.map((skill) => ({
          name: skill.name.trim(),
          yearsOfExperience: skill.yearsOfExperience,
          weight: skill.weight,
          type: skill.type,
        })),
        observations: payload.observations?.trim(),
        additionalCriteria: payload.additionalCriteria?.map((item) =>
          item.trim(),
        ),
        status,
        responsabilities: payload.responsabilities.map((item) => item.trim()),
        benefits: payload.benefits.map((item) => item.trim()),
        hiringManagerId,
      };

      const id = await this.jobsRepository.create(jobData);

      return { id };
    } catch (error) {
      throw new CreateJobServiceError('No se pudo crear la posición.', error);
    }
  }

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

  async getInternalJobDetail(
    jobId: string,
  ): Promise<GetInternalJobDetailResponse> {
    try {
      const normalizedJobId = jobId?.trim();

      if (!normalizedJobId) {
        throw new InternalJobDetailValidationError(
          'El jobId es obligatorio para obtener el detalle interno del puesto.',
        );
      }

      const job = await this.jobsRepository.findById(normalizedJobId);

      if (!job) {
        throw new InternalJobDetailNotFoundError(
          `No se encontró una posición con id ${normalizedJobId}.`,
        );
      }

      return job;
    } catch (error) {
      if (
        error instanceof InternalJobDetailValidationError ||
        error instanceof InternalJobDetailNotFoundError
      ) {
        throw error;
      }

      throw new GetInternalJobDetailServiceError(
        `No se pudo obtener el detalle interno del puesto ${jobId}.`,
        error,
      );
    }
  }

  async updatePosition(
    payload: UpdatePositionPayload,
  ): Promise<UpdatePositionResponse> {
    try {
      const jobId = payload.id.trim();
      const job = await this.jobsRepository.findById(jobId);

      if (!job) {
        throw new JobUpdateNotFoundError(jobId);
      }

      const updateData = this.buildUpdateData(payload);

      await this.jobsRepository.update(jobId, updateData);

      return { ok: true };
    } catch (error) {
      if (error instanceof JobUpdateNotFoundError) {
        throw error;
      }

      throw new UpdateJobServiceError(
        'No se pudo actualizar la posición.',
        error,
      );
    }
  }

  async updatePositionStatus(
    jobId: string,
    status: JobStatus,
  ): Promise<UpdatePositionStatusResponse> {
    try {
      const normalizedJobId = jobId.trim();
      const job = await this.jobsRepository.findById(normalizedJobId);

      if (!job) {
        throw new JobUpdateNotFoundError(normalizedJobId);
      }

      const updateData: UpdateJobDTO = { status };

      if (job.status !== 'open' && status === 'open' && !job.publishedAt) {
        updateData.publishedAt = new Date();
      }

      if (status === 'closed') {
        updateData.closedAt = new Date();
      }

      if (job.status === 'closed' && status !== 'closed') {
        updateData.closedAt = FieldValue.delete() as never;
      }

      await this.jobsRepository.update(normalizedJobId, updateData);

      return { ok: true };
    } catch (error) {
      if (error instanceof JobUpdateNotFoundError) {
        throw error;
      }

      throw new UpdateJobServiceError(
        'No se pudo actualizar el estado de la posición.',
        error,
      );
    }
  }

  private buildUpdateData(payload: UpdatePositionPayload): UpdateJobDTO {
    const updateData: UpdateJobDTO = {
      title: payload.title?.trim(),
      slug: payload.title ? toSlug(payload.title) : undefined,
      department: payload.department?.trim(),
      seniority: payload.seniority?.trim(),
      location: payload.location,
      city: payload.city?.trim(),
      description: payload.description?.trim(),
      observations: payload.observations?.trim(),
      additionalCriteria: payload.additionalCriteria?.map((item) =>
        item.trim(),
      ),
      responsabilities: payload.responsabilities?.map((item) => item.trim()),
      benefits: payload.benefits?.map((item) => item.trim()),
      skills: payload.skills?.map((skill) => ({
        name: skill.name.trim(),
        yearsOfExperience: skill.yearsOfExperience,
        weight: skill.weight,
        type: skill.type,
      })),
    };

    return Object.fromEntries(
      Object.entries(updateData).filter(([, value]) => value !== undefined),
    ) as UpdateJobDTO;
  }
}
