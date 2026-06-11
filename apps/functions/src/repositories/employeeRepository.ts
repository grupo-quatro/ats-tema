import type { GmailStatus } from '@ats/shared-types';
import { db } from '../core/firebaseAdmin';

const EMPLOYEES_COLLECTION = 'employees';

export interface IEmployeeRepository {
  getCalendarLink(uid: string): Promise<string | null>;
  setGmailStatus(uid: string, status: GmailStatus): Promise<void>;
}

export class EmployeeRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'EmployeeRepositoryError';
  }
}

export class EmployeeRepository implements IEmployeeRepository {
  private readonly collection = db.collection(EMPLOYEES_COLLECTION);

  async getCalendarLink(uid: string): Promise<string | null> {
    try {
      const snap = await this.collection.doc(uid).get();
      if (!snap.exists) {
        return null;
      }
      const data = snap.data();
      return (data?.calendarLink as string | undefined) ?? null;
    } catch (error) {
      throw new EmployeeRepositoryError(
        `No se pudo obtener el calendarLink para el empleado ${uid}.`,
        error,
      );
    }
  }

  async setGmailStatus(uid: string, status: GmailStatus): Promise<void> {
    try {
      await this.collection
        .doc(uid)
        .update({ gmailStatus: status, updatedAt: new Date() });
    } catch (error) {
      throw new EmployeeRepositoryError(
        `No se pudo actualizar gmailStatus para el empleado ${uid}.`,
        error,
      );
    }
  }
}
