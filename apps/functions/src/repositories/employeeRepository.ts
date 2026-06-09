import { db } from '../core/firebaseAdmin';

const EMPLOYEES_COLLECTION = 'employees';

export interface IEmployeeRepository {
  getCalendarLink(uid: string): Promise<string | null>;
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
}
