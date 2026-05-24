import type { UpdateApplicationStagePayload } from '@ats/shared-types';
import { HttpsError } from 'firebase-functions/v2/https';

const VALID_STAGES = [
  'profile_pending',
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

export function validateUpdateApplicationStagePayload(
  payload: Partial<UpdateApplicationStagePayload>,
): asserts payload is UpdateApplicationStagePayload {
  if (!payload.applicationId || payload.applicationId.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'El identificador de la postulación (applicationId) es obligatorio.',
    );
  }

  if (!payload.stage) {
    throw new HttpsError('invalid-argument', 'El campo stage es obligatorio.');
  }

  if (!VALID_STAGES.includes(payload.stage as (typeof VALID_STAGES)[number])) {
    throw new HttpsError(
      'invalid-argument',
      `El stage "${payload.stage}" no es válido.`,
    );
  }

  if (
    payload.stage === 'rejected' &&
    (!payload.rejectionReason || payload.rejectionReason.trim().length === 0)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'El motivo de rechazo (rejectionReason) es obligatorio cuando el stage es "rejected".',
    );
  }
}
