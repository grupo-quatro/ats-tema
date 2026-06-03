import { Timestamp } from 'firebase-admin/firestore';

import type { Job } from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

const JOBS_COLLECTION = 'jobs';

type FirestoreJob = Omit<
  Job,
  'createdAt' | 'updatedAt' | 'closedAt' | 'publishedAt' | 'deletedAt'
> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  closedAt?: Timestamp;
  publishedAt?: Timestamp;
  deletedAt?: Timestamp;
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

export class JobsRepository {
  private readonly collection = db.collection(JOBS_COLLECTION);

  async findById(jobId: string): Promise<Job | null> {
    try {
      const snapshot = await this.collection.doc(jobId).get();

      if (!snapshot.exists) {
        return null;
      }

      const job = this.mapToJob(snapshot.data() as FirestoreJob);

      return job.deletedAt ? null : job;
    } catch (error) {
      throw new JobsRepositoryError(
        `No se pudo obtener la posición ${jobId}.`,
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
      deletedAt: job.deletedAt?.toDate(),
    };
  }
}
