import { EMPLOYEE_ROLES, type EmployeeRole } from '@ats/shared-types';

export const INTERNAL_ROLES: EmployeeRole[] = [
  EMPLOYEE_ROLES.ADMIN,
  EMPLOYEE_ROLES.HR,
  EMPLOYEE_ROLES.AREA_LEADER,
  EMPLOYEE_ROLES.TECH_LEAD,
];

export function isInternalRole(role: string | null | undefined): boolean {
  return INTERNAL_ROLES.includes(role as EmployeeRole);
}
