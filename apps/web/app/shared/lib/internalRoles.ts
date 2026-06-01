import type { EmployeeRole } from '@ats/shared-types';

export const INTERNAL_ROLES: EmployeeRole[] = [
  'admin',
  'hr',
  'hiring_manager',
  'tech_lead',
];

export function isInternalRole(role: string | null | undefined): boolean {
  return INTERNAL_ROLES.includes(role as EmployeeRole);
}
