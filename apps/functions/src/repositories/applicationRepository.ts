// branch: fb-50-57
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import type {
  Application,
  CreateApplicationDTO,
  CreateStageHistoryEntryDTO,
  QueryOptions,
  SkillMatchStats,
  StageHistoryEntry,
  UpdateApplicationDTO,
} from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

const APPLICATIONS_COLLECTION = 'applications';

type FirestoreApplication = Omit<
  Application,
  'createdAt' | 'updatedAt' | 'stageUpdatedAt' | 'skillMatchStats'
> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  stageUpdatedAt: Timestamp;
  // actualizadoEn llega como Timestamp de Firestore; se convierte en mapToApplication
  skillMatchStats?: Omit<SkillMatchStats, 'actualizadoEn'> & {
    actualizadoEn: Timestamp;
  };
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

  async findByCandidateId(
    candidateId: string,
    jobId?: string,
  ): Promise<Application[]> {
    try {
      let query = this.collection.where('candidateId', '==', candidateId);

      if (jobId) {
        query = query.where('jobId', '==', jobId);
      } else {
        query = query.orderBy('createdAt', 'desc');
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
        `No se pudieron obtener las postulaciones para candidateId=${candidateId}.`,
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

  async countByJobIds(jobIds: string[]): Promise<Record<string, number>> {
    try {
      const uniqueJobIds = [...new Set(jobIds.filter(Boolean))];
      const counts: Record<string, number> = {};

      if (uniqueJobIds.length === 0) {
        return counts;
      }

      for (let index = 0; index < uniqueJobIds.length; index += 30) {
        const batch = uniqueJobIds.slice(index, index + 30);
        const snapshot = await this.collection
          .where('jobId', 'in', batch)
          .get();

        snapshot.docs.forEach((doc) => {
          const application = doc.data() as FirestoreApplication;
          counts[application.jobId] = (counts[application.jobId] ?? 0) + 1;
        });
      }

      return counts;
    } catch (error) {
      throw new ApplicationsRepositoryError(
        'No se pudieron contar las postulaciones por posición.',
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

  async delete(id: string): Promise<void> {
    try {
      const applicationRef = this.collection.doc(id);
      const stageHistorySnapshot = await applicationRef
        .collection('stageHistory')
        .get();
      const batch = db.batch();

      stageHistorySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      batch.delete(applicationRef);

      await batch.commit();
    } catch (error) {
      throw new ApplicationsRepositoryError(
        `No se pudo eliminar la postulación ${id}.`,
        error,
      );
    }
  }

  async addStageHistoryEntry(
    applicationId: string,
    entry: CreateStageHistoryEntryDTO,
  ): Promise<void> {
    try {
      const ref = this.collection
        .doc(applicationId)
        .collection('stageHistory')
        .doc();

      await ref.set({
        id: ref.id,
        ...entry,
        changedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      throw new ApplicationsRepositoryError(
        `No se pudo registrar el historial de etapa para ${applicationId}.`,
        error,
      );
    }
  }

  async getStageHistory(applicationId: string): Promise<StageHistoryEntry[]> {
    try {
      const snapshot = await this.collection
        .doc(applicationId)
        .collection('stageHistory')
        .orderBy('changedAt', 'desc')
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          changedAt: (data.changedAt as Timestamp).toDate(),
        } as StageHistoryEntry;
      });
    } catch (error) {
      throw new ApplicationsRepositoryError(
        `No se pudo obtener el historial de etapa para ${applicationId}.`,
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
      // Convertir el Timestamp anidado dentro de skillMatchStats (si existe)
      skillMatchStats: application.skillMatchStats
        ? {
            ...application.skillMatchStats,
            actualizadoEn: application.skillMatchStats.actualizadoEn.toDate(),
          }
        : undefined,
    };
  }
}
