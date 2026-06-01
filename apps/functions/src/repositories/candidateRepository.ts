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

  createId(): string {
    return this.collection.doc().id;
  }

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

  async findManyByEmail(email: string): Promise<Candidate[]> {
    try {
      const snapshot = await this.collection.where('email', '==', email).get();

      if (snapshot.empty) {
        return [];
      }

      return snapshot.docs.map((doc) =>
        this.mapToCandidate(doc.data() as FirestoreCandidate),
      );
    } catch (error) {
      throw new CandidatesRepositoryError(
        `No se pudieron buscar candidatos por email ${email}.`,
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
      const cleanCandidateData = JSON.parse(
        JSON.stringify(candidateData),
      ) as CreateCandidateDTO;

      if (!existingSnapshot.exists) {
        await candidateRef.set({
          id: candidateId,
          ...cleanCandidateData,
          createdAt: now,
          updatedAt: now,
        });

        return;
      }

      await candidateRef.set(
        {
          ...cleanCandidateData,
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
    const sanitizedParsedData = removeUndefinedValues(parsedData);
    const technicalSkills =
      sanitizedParsedData.technicalSkills ??
      sanitizedParsedData.hardSkills ??
      sanitizedParsedData.skills ??
      [];
    const fullName =
      sanitizedParsedData.fullName ??
      [sanitizedParsedData.firstName, sanitizedParsedData.lastName]
        .filter(Boolean)
        .join(' ');
    const parsedExperience = sanitizedParsedData.parsedExperience ?? [];
    const parsedEducation = sanitizedParsedData.parsedEducation ?? [];

    try {
      await this.collection.doc(candidateId).set(
        {
          firstName: sanitizedParsedData.firstName ?? null,
          lastName: sanitizedParsedData.lastName ?? null,
          fullName: fullName || null,
          email: sanitizedParsedData.email ?? null,
          phone: sanitizedParsedData.phone ?? null,
          location: sanitizedParsedData.location ?? null,
          yearsOfExperience: sanitizedParsedData.yearsOfExperience ?? null,
          education: sanitizedParsedData.education ?? null,
          professionalSummary:
            sanitizedParsedData.professionalSummary ??
            sanitizedParsedData.summary ??
            null,
          technicalSkills,
          hardSkills: FieldValue.delete(),
          softSkills: FieldValue.delete(),
          languages: FieldValue.delete(),
          cvParseStatus: 'done' as CvParseStatus,
          cvParseError: null,
          parsedCv:
            parsedExperience.length || parsedEducation.length
              ? {
                  experience: parsedExperience,
                  education: parsedEducation,
                }
              : FieldValue.delete(),
          parsedData: sanitizedParsedData,
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

  async delete(candidateId: string): Promise<void> {
    try {
      await this.collection.doc(candidateId).delete();
    } catch (error) {
      throw new CandidatesRepositoryError(
        `No se pudo eliminar el candidato ${candidateId}.`,
        error,
      );
    }
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

function removeUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefinedValues(item))
      .filter((item) => item !== undefined) as T;
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([entryKey, entryValue]) => [
        entryKey,
        removeUndefinedValues(entryValue),
      ]),
  ) as T;
}
