import type { Employee } from '@ats/shared-types';

export interface IEmployeeRepository {
  getById(uid: string): Promise<Employee | null>;
}
