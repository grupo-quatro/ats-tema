import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

import type {
  CreateEmailTemplateDTO,
  EmailTemplate,
  UpdateEmailTemplateDTO,
} from '@ats/shared-types';

import { db } from '../../shared/lib/firebase';
import type { IEmailTemplateRepository } from '../interfaces/IEmailTemplateRepository';

const COLLECTION = 'emailTemplates';

type FirestoreEmailTemplate = Omit<
  EmailTemplate,
  'id' | 'createdAt' | 'updatedAt'
> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

function toEmailTemplate(
  id: string,
  data: FirestoreEmailTemplate,
): EmailTemplate {
  return {
    ...data,
    id,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
}

export class FirebaseEmailTemplateRepository implements IEmailTemplateRepository {
  private get col() {
    return collection(db, COLLECTION);
  }

  async list(): Promise<EmailTemplate[]> {
    const q = query(this.col, orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      toEmailTemplate(d.id, d.data() as FirestoreEmailTemplate),
    );
  }

  async getById(id: string): Promise<EmailTemplate | null> {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) return null;
    return toEmailTemplate(snap.id, snap.data() as FirestoreEmailTemplate);
  }

  async create(dto: CreateEmailTemplateDTO): Promise<EmailTemplate> {
    const now = serverTimestamp();
    const docRef = await addDoc(this.col, {
      ...dto,
      createdAt: now,
      updatedAt: now,
    });
    const created = await getDoc(docRef);
    return toEmailTemplate(
      created.id,
      created.data() as FirestoreEmailTemplate,
    );
  }

  async update(
    id: string,
    dto: UpdateEmailTemplateDTO,
  ): Promise<EmailTemplate> {
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, {
      ...dto,
      updatedAt: serverTimestamp(),
    });
    const updated = await getDoc(ref);
    if (!updated.exists()) {
      throw new Error('No se encontró la plantilla.');
    }
    return toEmailTemplate(
      updated.id,
      updated.data() as FirestoreEmailTemplate,
    );
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  }
}
