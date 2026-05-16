import { FieldValue } from 'firebase-admin/firestore';

import type { CreateJobDTO } from '@ats/shared-types';

import { db } from '../core/firebase-admin';

const JOBS_COLLECTION = 'jobs';

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

export class JobsRepository {
  private readonly collection = db.collection(JOBS_COLLECTION);

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

      await jobRef.set(
        {
          ...jobData,
          updatedAt: now,
        },
        { merge: true },
      );

      return 'updated';
    } catch (error) {
      throw new JobsRepositoryError(
        `No se pudo crear o actualizar el puesto ${jobId}.`,
        error,
      );
    }
  }
}
