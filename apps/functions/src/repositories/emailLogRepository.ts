import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import type {
  CreateEmailLogDTO,
  EmailLog,
  UpdateEmailLogDTO,
} from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

const EMAIL_LOGS_COLLECTION = 'emailLogs';

type FirestoreEmailLog = Omit<EmailLog, 'attemptedAt' | 'sentAt'> & {
  attemptedAt: Timestamp;
  sentAt?: Timestamp;
};

export interface IEmailLogRepository {
  create(dto: CreateEmailLogDTO): Promise<string>;
  updateStatus(id: string, update: UpdateEmailLogDTO): Promise<void>;
  findById(id: string): Promise<EmailLog | null>;
  findByCandidate(candidateId: string): Promise<EmailLog[]>;
  findFailed(): Promise<EmailLog[]>;
  findFailedByApplication(applicationId: string): Promise<EmailLog[]>;
}

export class EmailLogRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'EmailLogRepositoryError';
  }
}

export class EmailLogRepository implements IEmailLogRepository {
  private readonly collection = db.collection(EMAIL_LOGS_COLLECTION);

  async create(dto: CreateEmailLogDTO): Promise<string> {
    try {
      const { attemptedAt: _attemptedAt, ...rest } = dto;
      const docRef = await this.collection.add({
        ...rest,
        attemptedAt: FieldValue.serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      throw new EmailLogRepositoryError(
        'No se pudo crear el registro de email.',
        error,
      );
    }
  }

  async updateStatus(id: string, update: UpdateEmailLogDTO): Promise<void> {
    try {
      await this.collection.doc(id).set(
        {
          ...update,
          ...(update.status === 'sent' && {
            sentAt: FieldValue.serverTimestamp(),
          }),
        },
        { merge: true },
      );
    } catch (error) {
      throw new EmailLogRepositoryError(
        `No se pudo actualizar el estado del registro de email ${id}.`,
        error,
      );
    }
  }

  async findById(id: string): Promise<EmailLog | null> {
    try {
      const snapshot = await this.collection.doc(id).get();
      if (!snapshot.exists) {
        return null;
      }
      const data = snapshot.data() as FirestoreEmailLog;
      return this.mapToEmailLog({ ...data, id });
    } catch (error) {
      throw new EmailLogRepositoryError(
        `No se pudo obtener el registro de email ${id}.`,
        error,
      );
    }
  }

  async findByCandidate(candidateId: string): Promise<EmailLog[]> {
    try {
      const snapshot = await this.collection
        .where('candidateId', '==', candidateId)
        .orderBy('attemptedAt', 'desc')
        .get();

      return snapshot.docs.map((doc) =>
        this.mapToEmailLog({
          ...(doc.data() as FirestoreEmailLog),
          id: doc.id,
        }),
      );
    } catch (error) {
      throw new EmailLogRepositoryError(
        `No se pudieron obtener los registros de email para el candidato ${candidateId}.`,
        error,
      );
    }
  }

  async findFailed(): Promise<EmailLog[]> {
    try {
      const snapshot = await this.collection
        .where('status', '==', 'failed')
        .orderBy('attemptedAt', 'desc')
        .get();

      return snapshot.docs.map((doc) =>
        this.mapToEmailLog({
          ...(doc.data() as FirestoreEmailLog),
          id: doc.id,
        }),
      );
    } catch (error) {
      throw new EmailLogRepositoryError(
        'No se pudieron obtener los registros de email fallidos.',
        error,
      );
    }
  }

  async findFailedByApplication(applicationId: string): Promise<EmailLog[]> {
    try {
      const snapshot = await this.collection
        .where('applicationId', '==', applicationId)
        .where('status', '==', 'failed')
        .orderBy('attemptedAt', 'desc')
        .get();

      return snapshot.docs.map((doc) =>
        this.mapToEmailLog({
          ...(doc.data() as FirestoreEmailLog),
          id: doc.id,
        }),
      );
    } catch (error) {
      throw new EmailLogRepositoryError(
        `No se pudieron obtener los registros fallidos para la postulación ${applicationId}.`,
        error,
      );
    }
  }

  private mapToEmailLog(log: FirestoreEmailLog & { id?: string }): EmailLog {
    return {
      ...log,
      id: log.id ?? '',
      attemptedAt: log.attemptedAt.toDate(),
      sentAt: log.sentAt?.toDate(),
    };
  }
}
