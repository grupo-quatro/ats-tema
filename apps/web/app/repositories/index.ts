import { FirebaseEmailTemplateRepository } from './firebase/FirebaseEmailTemplateRepository';
import { EmployeeFirebaseRepository } from './firebase/employee.firebase.repository';

export const emailTemplateRepository = new FirebaseEmailTemplateRepository();
export const employeeRepository = new EmployeeFirebaseRepository();
