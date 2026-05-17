import type { GetApplicationsByJobPayload } from '@ats/shared-types';
import { HttpsError } from 'firebase-functions/v2/https';

export function validateGetApplicationsByJobPayload(
  payload: Partial<GetApplicationsByJobPayload>,
): asserts payload is GetApplicationsByJobPayload {
  if (!payload.jobId || payload.jobId.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'El identificador de la posición (jobId) es obligatorio.',
    );
  }

  if (
    payload.orderBy !== undefined &&
    !['createdAt', 'fitScore'].includes(payload.orderBy)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'El campo de ordenamiento debe ser "createdAt" o "fitScore".',
    );
  }

  if (
    payload.orderDirection !== undefined &&
    !['asc', 'desc'].includes(payload.orderDirection)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'La dirección de ordenamiento debe ser "asc" o "desc".',
    );
  }

  if (
    payload.limit !== undefined &&
    (!Number.isInteger(payload.limit) || payload.limit < 1)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'El límite de resultados debe ser un número entero positivo.',
    );
  }
}
