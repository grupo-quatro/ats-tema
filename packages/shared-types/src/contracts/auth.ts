import type { EmployeeRole } from '../models/employee';

export interface SetUserRoleRequest {
  uid: string;
  role: EmployeeRole;
}

export interface SetUserRoleResponse {
  success: boolean;
}

export interface AtsCustomClaims {
  role: EmployeeRole;
}

export interface EnsureEmployeeRequest {
  email: string;
  displayName: string;
  photoURL: string | null;
}

export interface EnsureEmployeeResponse {
  isNew: boolean;
}
