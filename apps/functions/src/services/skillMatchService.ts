// branch: fb-50-57
import { FieldValue } from 'firebase-admin/firestore';

import { db } from '../core/firebaseAdmin';
import {
  buildCandidateSkillSet,
  computeWeightedMatch,
  parseJobSkills,
} from './skillMatchCalculator';

// ─── Tipos internos ────────────────────────────────────────────────────────────

import type { SkillMatchStats } from '@ats/shared-types';

/** Versión lista para Firestore: actualizadoEn es FieldValue en vez de Date. */
type FirestoreSkillMatchStats = Omit<SkillMatchStats, 'actualizadoEn'> & {
  actualizadoEn: ReturnType<typeof FieldValue.serverTimestamp>;
};

// ─── Error personalizado ───────────────────────────────────────────────────────

export class SkillMatchServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SkillMatchServiceError';
  }
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export class SkillMatchService {
  /**
   * Calcula el match ponderado de skills para una postulación y persiste
   * el resultado en el mismo documento que disparó el trigger.
   *
   * Lecturas Firestore: 3 en total (application → candidate + job en paralelo).
   * Escritura Firestore: 1 (.update sobre application).
   *
   * @param applicationId  ID del documento en la colección `applications`.
   */
  async calculateAndPersist(applicationId: string): Promise<void> {
    // ── 1. Leer la postulación ─────────────────────────────────────────────────
    const applicationRef = db.collection('applications').doc(applicationId);
    const applicationSnap = await applicationRef.get();

    if (!applicationSnap.exists) {
      throw new SkillMatchServiceError(
        `Postulación no encontrada: ${applicationId}`,
      );
    }

    const { candidateId, jobId } = applicationSnap.data() as {
      candidateId?: string;
      jobId?: string;
    };

    if (!candidateId || !jobId) {
      throw new SkillMatchServiceError(
        `La postulación ${applicationId} no contiene candidateId o jobId válidos.`,
      );
    }

    // ── 2. Leer candidato y puesto en paralelo ─────────────────────────────────
    const [candidateSnap, jobSnap] = await Promise.all([
      db.collection('candidates').doc(candidateId).get(),
      db.collection('jobs').doc(jobId).get(),
    ]);

    if (!candidateSnap.exists) {
      throw new SkillMatchServiceError(
        `Candidato no encontrado: ${candidateId}`,
      );
    }

    if (!jobSnap.exists) {
      throw new SkillMatchServiceError(`Puesto no encontrado: ${jobId}`);
    }

    // ── 3. Parsear skills ──────────────────────────────────────────────────────
    const candidateData = candidateSnap.data()!;
    const jobData = jobSnap.data()!;

    const rawCandidateSkills: unknown[] = Array.isArray(
      candidateData.technicalSkills,
    )
      ? candidateData.technicalSkills
      : [];
    const rawJobSkills: unknown[] = Array.isArray(jobData.skills)
      ? jobData.skills
      : [];

    const candidateSkillSet = buildCandidateSkillSet(rawCandidateSkills);
    const jobSkills = parseJobSkills(rawJobSkills);

    // ── 4. Calcular match ponderado (lógica pura, sin I/O) ─────────────────────
    const matchResult = computeWeightedMatch(jobSkills, candidateSkillSet);

    const skillMatchStats: FirestoreSkillMatchStats = {
      ...matchResult,
      actualizadoEn: FieldValue.serverTimestamp(),
    };

    // ── 5. Persistir ───────────────────────────────────────────────────────────
    await applicationRef.update({
      skillMatchStats,
      fitScore: matchResult.scoreTotal, // campo existente en Application → compatibilidad
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}
