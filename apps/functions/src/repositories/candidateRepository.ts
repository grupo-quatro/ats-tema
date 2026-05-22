import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import type {
  Candidate,
  CreateCandidateDTO,
  CvParseStatus,
} from '@ats/shared-types';

import { db } from '../core/firebase-admin';

const CANDIDATES_COLLECTION = 'candidates';

type FirestoreCandidate = Omit<Candidate, 'createdAt' | 'updatedAt'> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export class CandidatesRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CandidatesRepositoryError';
  }
}

export class CandidatesRepository {
  private readonly collection = db.collection(CANDIDATES_COLLECTION);

  async findById(candidateId: string): Promise<Candidate | null> {
    try {
      const snapshot = await this.collection.doc(candidateId).get();

      if (!snapshot.exists) {
        return null;
      }

      return this.mapToCandidate(snapshot.data() as FirestoreCandidate);
    } catch (error) {
      throw new CandidatesRepositoryError(
        `No se pudo obtener el candidato ${candidateId}.`,
        error,
      );
    }
  }

  async findByEmail(email: string): Promise<Candidate | null> {
    try {
      const snapshot = await this.collection
        .where('email', '==', email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return this.mapToCandidate(snapshot.docs[0].data() as FirestoreCandidate);
    } catch (error) {
      throw new CandidatesRepositoryError(
        `No se pudo buscar un candidato por email ${email}.`,
        error,
      );
    }
  }

  async createOrUpdateCandidate(
    candidateId: string,
    candidateData: CreateCandidateDTO,
  ): Promise<void> {
    try {
      const candidateRef = this.collection.doc(candidateId);
      const existingSnapshot = await candidateRef.get();
      const now = FieldValue.serverTimestamp();

      if (!existingSnapshot.exists) {
        await candidateRef.set({
          id: candidateId,
          ...candidateData,
          createdAt: now,
          updatedAt: now,
        });

        return;
      }

      await candidateRef.set(
        {
          ...candidateData,
          updatedAt: now,
        },
        { merge: true },
      );
    } catch (error) {
      throw new CandidatesRepositoryError(
        `No se pudo crear o actualizar el candidato ${candidateId}.`,
        error,
      );
    }
  }

  async updateCvStoragePath(
    candidateId: string,
    cvStoragePath: string,
    cvParseStatus: CvParseStatus,
  ): Promise<void> {
    try {
      await this.collection.doc(candidateId).set(
        {
          cvStoragePath,
          cvParseStatus,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      throw new CandidatesRepositoryError(
        `No se pudo actualizar el CV del candidato ${candidateId}.`,
        error,
      );
    }
  }

  async update(id: string, data: Partial<Candidate>): Promise<void> {
    const cleanData = JSON.parse(JSON.stringify(data)); // Evita inputs con undefined que rompen Firestore
    await db
      .collection('candidates')
      .doc(id)
      .update({
        ...cleanData,
        updatedAt: FieldValue.serverTimestamp(),
      });
  }

  private mapToCandidate(candidate: FirestoreCandidate): Candidate {
    return {
      ...candidate,
      createdAt: candidate.createdAt.toDate(),
      updatedAt: candidate.updatedAt.toDate(),
    };
  }
}
