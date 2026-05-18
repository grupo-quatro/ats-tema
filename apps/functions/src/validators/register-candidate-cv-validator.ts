import type { RegisterCandidateCVPayload } from '@ats/shared-types';
import { HttpsError } from 'firebase-functions/v2/https';

export function validateStartApplicationWithCVPayload(
  payload: Partial<RegisterCandidateCVPayload>,
): asserts payload is RegisterCandidateCVPayload {
  if (!payload.jobId || payload.jobId.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'La posición asociada a la postulación es obligatoria.',
    );
  }
}
