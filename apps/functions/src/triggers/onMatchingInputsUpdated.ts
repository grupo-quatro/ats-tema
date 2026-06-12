import { logger } from 'firebase-functions';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

import { SkillMatchService } from '../services/skillMatchService';

const skillMatchService = new SkillMatchService();

function serializeForComparison(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function candidateMatchingInputsChanged(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): boolean {
  // El parsing puede modificar skills mientras el perfil sigue draft. Se espera
  // la confirmación del candidato antes de considerar esos datos definitivos.
  const canHaveValidScore =
    before.profileStatus === 'completed' || after.profileStatus === 'completed';

  return (
    canHaveValidScore &&
    (before.profileStatus !== after.profileStatus ||
      serializeForComparison(before.technicalSkills) !==
        serializeForComparison(after.technicalSkills))
  );
}

export function jobMatchingInputsChanged(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): boolean {
  return (
    serializeForComparison(before.skills) !==
    serializeForComparison(after.skills)
  );
}

/**
 * Recalcula las postulaciones cuando se confirma el perfil o cambian las
 * technicalSkills de un perfil que puede tener un score válido.
 */
export const onCandidateMatchingInputsUpdated = onDocumentUpdated(
  'candidates/{candidateId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after || !candidateMatchingInputsChanged(before, after)) {
      return;
    }

    const candidateId = event.params.candidateId;
    logger.info(
      `[onCandidateMatchingInputsUpdated] Recalculando postulaciones de candidateId=${candidateId}`,
    );

    await skillMatchService.recalculateForCandidate(candidateId);
  },
);

/**
 * Recalcula todas las postulaciones de una posición cuando cambia cualquier
 * criterio contenido en Job.skills.
 */
export const onJobMatchingInputsUpdated = onDocumentUpdated(
  'jobs/{jobId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after || !jobMatchingInputsChanged(before, after)) {
      return;
    }

    const jobId = event.params.jobId;
    logger.info(
      `[onJobMatchingInputsUpdated] Recalculando postulaciones de jobId=${jobId}`,
    );

    await skillMatchService.recalculateForJob(jobId);
  },
);
