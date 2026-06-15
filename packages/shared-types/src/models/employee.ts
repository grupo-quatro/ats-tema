export const EMPLOYEE_ROLES = {
  HR: 'hr',
  TECH_LEAD: 'tech_lead',
  AREA_LEADER: 'area_leader',
  ADMIN: 'admin',
} as const;

export type EmployeeRole = (typeof EMPLOYEE_ROLES)[keyof typeof EMPLOYEE_ROLES];

export const GMAIL_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
} as const;

export type GmailStatus = (typeof GMAIL_STATUS)[keyof typeof GMAIL_STATUS];

export interface Employee {
  id: string; // mismo uid que Firebase Auth
  name: string;
  email: string;
  role: EmployeeRole;
  department: string;
  active: boolean;
  calendarLink?: string;
  gmailStatus?: GmailStatus;
  calendarStatus?: GmailStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateEmployeeDTO = Omit<Employee, 'createdAt' | 'updatedAt'>;
export type UpdateEmployeeDTO = Partial<Omit<Employee, 'id' | 'createdAt'>>;
