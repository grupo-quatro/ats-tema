import type { UpdateApplicationStagePayload } from '@ats/shared-types';

const VALID_STAGES = [
  'applied',
  'screening',
  'cv_submitted',
  'interview_1_scheduled',
  'interview_1_done',
  'interview_2_scheduled',
  'interview_2_done',
  'offer_sent',
  'hired',
  'rejected',
  'withdrawn',
] as const;

export class UpdateApplicationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpdateApplicationValidationError';
  }
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

  if (!VALID_STAGES.includes(payload.stage as (typeof VALID_STAGES)[number])) {
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
