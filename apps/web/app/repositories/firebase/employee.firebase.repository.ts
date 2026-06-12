import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { Employee } from '@ats/shared-types';
import { db } from '../../shared/lib/firebase';
import type { IEmployeeRepository } from '../interfaces/employee.repository';

export class EmployeeFirebaseRepository implements IEmployeeRepository {
  private readonly collectionName = 'employees';

  async getById(uid: string): Promise<Employee | null> {
    const ref = doc(db, this.collectionName, uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Employee;
  }

  subscribe(
    uid: string,
    onUpdate: (employee: Employee | null) => void,
  ): () => void {
    const ref = doc(db, this.collectionName, uid);
    return onSnapshot(ref, (snap) => {
      onUpdate(
        snap.exists() ? ({ id: snap.id, ...snap.data() } as Employee) : null,
      );
    });
  }
}
