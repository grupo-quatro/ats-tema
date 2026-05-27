import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import type {
  Candidate,
  CreateCandidateDTO,
  CvParseStatus,
  ParsedCandidateProfileData,
} from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

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

  async markParsingProcessing(
    candidateId: string,
    cvStoragePath: string,
  ): Promise<void> {
    try {
      await this.collection.doc(candidateId).set(
        {
          cvStoragePath,
          cvParseStatus: 'processing' as CvParseStatus,
          cvParseError: null,
          parsedData: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      throw new CandidatesRepositoryError(
        `No se pudo marcar el parsing como processing para ${candidateId}.`,
        error,
      );
    }
  }

  async markParsingDone(
    candidateId: string,
    parsedData: ParsedCandidateProfileData,
  ): Promise<void> {
    const technicalSkills =
      parsedData.technicalSkills ??
      parsedData.hardSkills ??
      parsedData.skills ??
      [];
    const fullName =
      parsedData.fullName ??
      [parsedData.firstName, parsedData.lastName].filter(Boolean).join(' ');

    try {
      await this.collection.doc(candidateId).set(
        {
          firstName: parsedData.firstName ?? null,
          lastName: parsedData.lastName ?? null,
          fullName: fullName || null,
          email: parsedData.email ?? null,
          phone: parsedData.phone ?? null,
          location: parsedData.location ?? null,
          yearsOfExperience: parsedData.yearsOfExperience ?? null,
          education: parsedData.education ?? null,
          professionalSummary:
            parsedData.professionalSummary ?? parsedData.summary ?? null,
          technicalSkills,
          hardSkills: FieldValue.delete(),
          softSkills: FieldValue.delete(),
          languages: FieldValue.delete(),
          cvParseStatus: 'done' as CvParseStatus,
          cvParseError: null,
          parsedData,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      throw new CandidatesRepositoryError(
        `No se pudo marcar el parsing como done para ${candidateId}.`,
        error,
      );
    }
  }

  async markParsingFailed(
    candidateId: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      await this.collection.doc(candidateId).set(
        {
          cvParseStatus: 'failed' as CvParseStatus,
          cvParseError: errorMessage,
          parsedData: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      throw new CandidatesRepositoryError(
        `No se pudo marcar el parsing como failed para ${candidateId}.`,
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
        hardSkills: FieldValue.delete(),
        softSkills: FieldValue.delete(),
        languages: FieldValue.delete(),
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

  async updateCvParseSuccess(
    candidateId: string,
    parsedData: ParsedCandidateProfileData,
  ): Promise<void> {
    await this.markParsingDone(candidateId, parsedData);
  }

  async updateCvParseFailure(candidateId: string): Promise<void> {
    await this.markParsingFailed(candidateId, 'Error interno al procesar CV');
  }
}
