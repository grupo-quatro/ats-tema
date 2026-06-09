export const EMPLOYEE_ROLES = {
  HR: 'hr',
  TECH_LEAD: 'tech_lead',
  AREA_LEADER: 'area_leader',
  ADMIN: 'admin',
} as const;

export type EmployeeRole = (typeof EMPLOYEE_ROLES)[keyof typeof EMPLOYEE_ROLES];

export interface Employee {
  id: string; // mismo uid que Firebase Auth
  name: string;
  email: string;
  role: EmployeeRole;
  department: string;
  active: boolean;
  calendarLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateEmployeeDTO = Omit<Employee, 'createdAt' | 'updatedAt'>;
export type UpdateEmployeeDTO = Partial<Omit<Employee, 'id' | 'createdAt'>>;
