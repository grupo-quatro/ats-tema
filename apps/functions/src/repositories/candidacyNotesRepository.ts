import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import type { CandidacyNote } from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

const APPLICATIONS_COLLECTION = 'applications';
const CANDIDACY_NOTES_SUBCOLLECTION = 'candidacyNotes';

type FirestoreCandidacyNote = Omit<CandidacyNote, 'createdAt' | 'updatedAt'> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type CreateCandidacyNoteData = {
  applicationId: string;
  text: string;
  source: CandidacyNote['source'];
  authorUid: string;
  authorName: string;
  authorRole: string;
};

export class CandidacyNotesRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CandidacyNotesRepositoryError';
  }
}

export class CandidacyNotesRepository {
  private readonly collection = db.collection(APPLICATIONS_COLLECTION);

  async create(
    applicationId: string,
    data: CreateCandidacyNoteData,
  ): Promise<CandidacyNote> {
    try {
      const ref = this.collection
        .doc(applicationId)
        .collection(CANDIDACY_NOTES_SUBCOLLECTION)
        .doc();

      const cleanData = JSON.parse(
        JSON.stringify(data),
      ) as CreateCandidacyNoteData;

      const now = FieldValue.serverTimestamp();

      await ref.set({
        id: ref.id,
        ...cleanData,
        createdAt: now,
        updatedAt: now,
      });

      const snapshot = await ref.get();
      return this.mapToCandidacyNote(snapshot.data() as FirestoreCandidacyNote);
    } catch (error) {
      throw new CandidacyNotesRepositoryError(
        `No se pudo crear la nota para ${applicationId}.`,
        error,
      );
    }
  }

  async update(
    applicationId: string,
    noteId: string,
    text: string,
  ): Promise<CandidacyNote> {
    try {
      const ref = this.collection
        .doc(applicationId)
        .collection(CANDIDACY_NOTES_SUBCOLLECTION)
        .doc(noteId);

      await ref.update({
        text: text.trim(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const snapshot = await ref.get();
      if (!snapshot.exists) {
        throw new CandidacyNotesRepositoryError(`La nota ${noteId} no existe.`);
      }

      return this.mapToCandidacyNote(snapshot.data() as FirestoreCandidacyNote);
    } catch (error) {
      if (error instanceof CandidacyNotesRepositoryError) {
        throw error;
      }
      throw new CandidacyNotesRepositoryError(
        `No se pudo actualizar la nota ${noteId}.`,
        error,
      );
    }
  }

  async findById(
    applicationId: string,
    noteId: string,
  ): Promise<CandidacyNote | null> {
    try {
      const snapshot = await this.collection
        .doc(applicationId)
        .collection(CANDIDACY_NOTES_SUBCOLLECTION)
        .doc(noteId)
        .get();

      if (!snapshot.exists) {
        return null;
      }

      return this.mapToCandidacyNote(snapshot.data() as FirestoreCandidacyNote);
    } catch (error) {
      throw new CandidacyNotesRepositoryError(
        `No se pudo obtener la nota ${noteId}.`,
        error,
      );
    }
  }

  async findByApplicationId(applicationId: string): Promise<CandidacyNote[]> {
    try {
      const snapshot = await this.collection
        .doc(applicationId)
        .collection(CANDIDACY_NOTES_SUBCOLLECTION)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map((doc) =>
        this.mapToCandidacyNote(doc.data() as FirestoreCandidacyNote),
      );
    } catch (error) {
      throw new CandidacyNotesRepositoryError(
        `No se pudieron obtener las notas para ${applicationId}.`,
        error,
      );
    }
  }

  private mapToCandidacyNote(data: FirestoreCandidacyNote): CandidacyNote {
    const source =
      data.source ??
      (data.text.startsWith('[Entrevista') ? 'interview' : 'manual');

    return {
      ...data,
      source,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }
}
