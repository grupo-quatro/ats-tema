import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import type {
  CreateJobDTO,
  Job,
  JobStatus,
  ListPositionsFilters,
  ListPositionsOrderBy,
  ListPositionsResponse,
  UpdateJobDTO,
} from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

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

  async findWithFilters(
    filters: ListPositionsFilters,
  ): Promise<ListPositionsResponse> {
    try {
      let query: FirebaseFirestore.Query = this.collection;

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      const hasSearch = Boolean(filters.search);
      const orderBy = filters.orderBy ?? 'publishedAt';
      const orderDir = filters.orderDir ?? 'desc';

      if (hasSearch) {
        const search = filters.search;
        query = query
          .where('title', '>=', search)
          .where('title', '<=', search + '')
          .orderBy('title');
      } else {
        query = query.orderBy(orderBy, orderDir);
      }

      const snapshot = await query.get();
      let jobs = snapshot.docs.map((doc) =>
        this.mapToJob(doc.data() as FirestoreJob),
      );

      if (filters.location) {
        jobs = jobs.filter((j) => j.location === filters.location);
      }

      if (filters.department) {
        jobs = jobs.filter((j) => j.department === filters.department);
      }

      const total = jobs.length;
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 10;
      const totalPages = Math.ceil(total / limit);
      const paginated = jobs.slice((page - 1) * limit, page * limit);

      return { jobs: paginated, total, page, totalPages };
    } catch (error) {
      throw new JobsRepositoryError(
        'No se pudieron obtener las posiciones.',
        error,
      );
    }
  }

  async findDepartments(): Promise<string[]> {
    try {
      const snapshot = await this.collection.get();
      const departments = snapshot.docs
        .map((doc) => doc.data().department as string)
        .filter(Boolean);
      return [...new Set(departments)].sort();
    } catch (error) {
      throw new JobsRepositoryError(
        'No se pudieron obtener los departamentos.',
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
