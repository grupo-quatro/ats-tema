import type {
  ApplicationStage,
  UpdateApplicationStagePayload,
} from '@ats/shared-types';
import {
  JUMP_STAGES,
  PIPELINE_ORDER,
  SYSTEM_ONLY_STAGES,
} from '@ats/shared-types';

export class UpdateApplicationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpdateApplicationValidationError';
  }
}

/**
 * Determina si la transición de `current` a `next` es permitida:
 * - Los stages SYSTEM_ONLY nunca pueden ser destino de una acción de recruiter.
 * - Los JUMP_STAGES (rejected, withdrawn, send_offer) son accesibles desde cualquier stage activo.
 * - El resto solo puede avanzar: el índice de `next` debe ser mayor al de `current` en PIPELINE_ORDER.
 */
export function isValidTransition(
  current: ApplicationStage,
  next: ApplicationStage,
): boolean {
  if (SYSTEM_ONLY_STAGES.includes(next)) return false;
  if (JUMP_STAGES.includes(next)) return true;
  const ci = PIPELINE_ORDER.indexOf(current);
  const ni = PIPELINE_ORDER.indexOf(next);
  return ni > ci;
}

export function validateUpdateApplicationStagePayload(
  payload: Partial<UpdateApplicationStagePayload>,
): asserts payload is UpdateApplicationStagePayload {
  if (!payload.applicationId || payload.applicationId.trim().length === 0) {
    throw new UpdateApplicationValidationError(
      'El identificador de la postulación (applicationId) es obligatorio.',
    );
  }

  if (!payload.stage) {
    throw new UpdateApplicationValidationError(
      'El campo stage es obligatorio.',
    );
  }

  const allValidStages: readonly ApplicationStage[] = [
    ...PIPELINE_ORDER.filter((s) => !SYSTEM_ONLY_STAGES.includes(s)),
    ...JUMP_STAGES.filter((s) => !PIPELINE_ORDER.includes(s)),
  ];

  if (!allValidStages.includes(payload.stage)) {
    throw new UpdateApplicationValidationError(
      `El stage "${payload.stage}" no es válido.`,
    );
  }

  if (
    payload.stage === 'rejected' &&
    (!payload.rejectionReason || payload.rejectionReason.trim().length === 0)
  ) {
    throw new UpdateApplicationValidationError(
      'El motivo de rechazo (rejectionReason) es obligatorio cuando el stage es "rejected".',
    );
  }
}
