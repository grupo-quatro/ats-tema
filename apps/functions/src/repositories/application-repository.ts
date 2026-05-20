import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import type {
  Application,
  CreateApplicationDTO,
  QueryOptions,
  UpdateApplicationDTO,
} from '@ats/shared-types';

import { db } from '../core/firebase-admin';

const APPLICATIONS_COLLECTION = 'applications';

type FirestoreApplication = Omit<
  Application,
  'createdAt' | 'updatedAt' | 'stageUpdatedAt'
> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  stageUpdatedAt: Timestamp;
};

export class ApplicationsRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ApplicationsRepositoryError';
  }
}

export class ApplicationsRepository {
  private readonly collection = db.collection(APPLICATIONS_COLLECTION);

  async findById(applicationId: string): Promise<Application | null> {
    try {
      const snapshot = await this.collection.doc(applicationId).get();

      if (!snapshot.exists) {
        return null;
      }

      return this.mapToApplication(snapshot.data() as FirestoreApplication);
    } catch (error) {
      throw new ApplicationsRepositoryError(
        `No se pudo obtener la postulación ${applicationId}.`,
        error,
      );
    }
  }

  async findByCandidateAndJob(
    candidateId: string,
    jobId: string,
  ): Promise<Application | null> {
    try {
      const applicationId = this.buildApplicationId(candidateId, jobId);
      return this.findById(applicationId);
    } catch (error) {
      throw new ApplicationsRepositoryError(
        `No se pudo buscar la postulación para candidateId=${candidateId} y jobId=${jobId}.`,
        error,
      );
    }
  }

  async findByJobId(
    jobId: string,
    options?: QueryOptions,
  ): Promise<Application[]> {
    try {
      const {
        orderBy = 'createdAt',
        orderDirection = 'desc',
        limit,
      } = options ?? {};

      // fitScore requiere índice compuesto en Firestore: jobId ASC + fitScore DESC
      let query = this.collection
        .where('jobId', '==', jobId)
        .orderBy(orderBy, orderDirection);

      if (limit !== undefined) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();

      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map((doc) =>
        this.mapToApplication(doc.data() as FirestoreApplication),
      );
    } catch (error) {
      throw new ApplicationsRepositoryError(
        `No se pudieron obtener las postulaciones para jobId=${jobId}.`,
        error,
      );
    }
  }

  async create(applicationData: CreateApplicationDTO): Promise<string> {
    try {
      const applicationId = this.buildApplicationId(
        applicationData.candidateId,
        applicationData.jobId,
      );

      const applicationRef = this.collection.doc(applicationId);
      const now = FieldValue.serverTimestamp();

      await applicationRef.create({
        id: applicationId,
        ...applicationData,
        createdAt: now,
        updatedAt: now,
        stageUpdatedAt: now,
      });

      return applicationId;
    } catch (error) {
      throw new ApplicationsRepositoryError(
        'No se pudo crear la postulación.',
        error,
      );
    }
  }

  private buildApplicationId(candidateId: string, jobId: string): string {
    const safeJobId = encodeURIComponent(jobId);
    return `${candidateId}_${safeJobId}`;
  }

  async update(id: string, data: UpdateApplicationDTO): Promise<void> {
    try {
      const cleanData = JSON.parse(
        JSON.stringify(data),
      ) as UpdateApplicationDTO;

      const updateData: Record<string, unknown> = {
        ...cleanData,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (data.stage) {
        updateData.stageUpdatedAt = FieldValue.serverTimestamp();
      }

      await this.collection.doc(id).update(updateData);
    } catch (error) {
      throw new ApplicationsRepositoryError(
        `No se pudo actualizar la postulación ${id}.`,
        error,
      );
    }
  }

  private mapToApplication(application: FirestoreApplication): Application {
    return {
      ...application,
      createdAt: application.createdAt.toDate(),
      updatedAt: application.updatedAt.toDate(),
      stageUpdatedAt: application.stageUpdatedAt.toDate(),
    };
  }
}
