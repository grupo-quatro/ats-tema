export type EmployeeRole = "hr" | "tech_lead" | "hiring_manager" | "admin";

export interface Employee {
  id: string; // mismo uid que Firebase Auth
  name: string;
  email: string;
  role: EmployeeRole;
  department: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateEmployeeDTO = Omit<Employee, "createdAt" | "updatedAt">;
export type UpdateEmployeeDTO = Partial<Omit<Employee, "id" | "createdAt">>;
