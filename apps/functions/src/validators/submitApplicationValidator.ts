import type { SubmitApplicationPayload } from '@ats/shared-types';
import { HttpsError } from 'firebase-functions/v2/https';

export function validateSubmitApplicationPayload(
  payload: Partial<SubmitApplicationPayload>,
): asserts payload is SubmitApplicationPayload {
  if (!payload.jobId || payload.jobId.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'El identificador de la posición es obligatorio.',
    );
  }
}
