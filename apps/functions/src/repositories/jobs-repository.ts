import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import type {
  CreateJobDTO,
  Job,
  JobStatus,
  UpdateJobDTO,
} from '@ats/shared-types';

import { db } from '../core/firebase-admin';

const JOBS_COLLECTION = 'jobs';

type FirestoreJob = Omit<
  Job,
  'createdAt' | 'updatedAt' | 'closedAt' | 'publishedAt'
> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  closedAt?: Timestamp;
  publishedAt?: Timestamp;
};

export interface JobsRepositoryContract {
  findAll(): Promise<Job[]>;
  findById(jobId: string): Promise<Job | null>;
  findByStatus(status: JobStatus): Promise<Job[]>;
  create(jobData: CreateJobDTO): Promise<string>;
  update(jobId: string, jobData: UpdateJobDTO): Promise<void>;
}

export type SeedJobInput = CreateJobDTO & {
  publishedAt?: Date;
};

export class JobsRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'JobsRepositoryError';
  }
}

export class JobsRepository implements JobsRepositoryContract {
  private readonly collection = db.collection(JOBS_COLLECTION);

  async findAll(): Promise<Job[]> {
    try {
      const snapshot = await this.collection.get();

      return snapshot.docs.map((document) =>
        this.mapToJob(document.data() as FirestoreJob),
      );
    } catch (error) {
      throw new JobsRepositoryError(
        'No se pudieron obtener los puestos.',
        error,
      );
    }
  }

  async findById(jobId: string): Promise<Job | null> {
    try {
      const snapshot = await this.collection.doc(jobId).get();

      if (!snapshot.exists) {
        return null;
      }

      return this.mapToJob(snapshot.data() as FirestoreJob);
    } catch (error) {
      throw new JobsRepositoryError(
        `No se pudo obtener el puesto ${jobId}.`,
        error,
      );
    }
  }

  async findByStatus(status: JobStatus): Promise<Job[]> {
    try {
      const snapshot = await this.collection
        .where('status', '==', status)
        .get();

      return snapshot.docs.map((document) =>
        this.mapToJob(document.data() as FirestoreJob),
      );
    } catch (error) {
      throw new JobsRepositoryError(
        `No se pudieron obtener puestos con estado ${status}.`,
        error,
      );
    }
  }

  async create(jobData: CreateJobDTO): Promise<string> {
    try {
      const jobRef = this.collection.doc();
      const now = FieldValue.serverTimestamp();

      await jobRef.create({
        id: jobRef.id,
        ...jobData,
        createdAt: now,
        updatedAt: now,
      });

      return jobRef.id;
    } catch (error) {
      throw new JobsRepositoryError('No se pudo crear el puesto.', error);
    }
  }

  async update(jobId: string, jobData: UpdateJobDTO): Promise<void> {
    try {
      await this.collection.doc(jobId).set(
        {
          ...jobData,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      throw new JobsRepositoryError(
        `No se pudo actualizar el puesto ${jobId}.`,
        error,
      );
    }
  }

  async createOrUpdateJob(
    jobId: string,
    jobData: SeedJobInput,
  ): Promise<'created' | 'updated'> {
    try {
      const jobRef = this.collection.doc(jobId);
      const existingSnapshot = await jobRef.get();
      const now = FieldValue.serverTimestamp();

      if (!existingSnapshot.exists) {
        await jobRef.set({
          id: jobId,
          ...jobData,
          createdAt: now,
          updatedAt: now,
        });

        return 'created';
      }

      const existingData = existingSnapshot.data() as FirestoreJob;

      await jobRef.set({
        id: jobId,
        ...jobData,
        createdAt: existingData.createdAt,
        updatedAt: now,
      });

      return 'updated';
    } catch (error) {
      throw new JobsRepositoryError(
        `No se pudo crear o actualizar el puesto ${jobId}.`,
        error,
      );
    }
  }

  private mapToJob(job: FirestoreJob): Job {
    return {
      ...job,
      createdAt: job.createdAt.toDate(),
      updatedAt: job.updatedAt.toDate(),
      closedAt: job.closedAt?.toDate(),
      publishedAt: job.publishedAt?.toDate(),
    };
  }
}