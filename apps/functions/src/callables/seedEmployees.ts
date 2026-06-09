import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from '../core/firebaseAdmin';

interface SeedEmployeeInput {
  uid: string;
  email: string;
  name: string;
  role: string;
  calendarLink?: string;
}

function isEmulatorEnvironment(): boolean {
  return (
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    typeof process.env.FIRESTORE_EMULATOR_HOST === 'string'
  );
}

export const seedEmployees = onCall(
  async (request: { data: { employees: SeedEmployeeInput[] } }) => {
    if (!isEmulatorEnvironment()) {
      throw new HttpsError(
        'failed-precondition',
        'seedEmployees solo está habilitado en emuladores.',
      );
    }

    const { employees } = request.data;

    if (!Array.isArray(employees)) {
      throw new HttpsError('invalid-argument', 'employees debe ser un array.');
    }

    const now = new Date();
    const batch = db.batch();

    for (const emp of employees) {
      const ref = db.collection('employees').doc(emp.uid);
      const doc: Record<string, unknown> = {
        id: emp.uid,
        email: emp.email,
        name: emp.name,
        role: emp.role,
        department: '',
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      if (emp.calendarLink) {
        doc.calendarLink = emp.calendarLink;
      }
      batch.set(ref, doc, { merge: true });
    }

    await batch.commit();

    return { processed: employees.length };
  },
);
