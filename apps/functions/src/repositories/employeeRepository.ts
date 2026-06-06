import { Timestamp } from 'firebase-admin/firestore';

import type { Employee } from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

const EMPLOYEES_COLLECTION = 'employees';

type FirestoreEmployee = Omit<Employee, 'createdAt' | 'updatedAt'> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export class EmployeesRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'EmployeesRepositoryError';
  }
}

export class EmployeesRepository {
  private readonly collection = db.collection(EMPLOYEES_COLLECTION);

  async findById(employeeId: string): Promise<Employee | null> {
    try {
      const snapshot = await this.collection.doc(employeeId).get();

      if (!snapshot.exists) {
        return null;
      }

      return this.mapToEmployee(snapshot.data() as FirestoreEmployee);
    } catch (error) {
      throw new EmployeesRepositoryError(
        `No se pudo obtener el empleado ${employeeId}.`,
        error,
      );
    }
  }

  private mapToEmployee(employee: FirestoreEmployee): Employee {
    return {
      ...employee,
      createdAt: employee.createdAt.toDate(),
      updatedAt: employee.updatedAt.toDate(),
    };
  }
}
