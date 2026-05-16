import type { RegisterCandidatePayload } from '@ats/shared-types';
import { HttpsError } from 'firebase-functions/v2/https';

export function validateRegisterCandidatePayload(
  payload: Partial<RegisterCandidatePayload>,
): asserts payload is RegisterCandidatePayload {
  if (!payload.jobId || payload.jobId.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'La posición asociada a la postulación es obligatoria.',
    );
  }

  if (!payload.firstName || payload.firstName.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'El nombre del candidato es obligatorio.',
    );
  }

  if (!payload.lastName || payload.lastName.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'El apellido del candidato es obligatorio.',
    );
  }

  if (!payload.email || payload.email.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'El email del candidato es obligatorio.',
    );
  }

  if (!payload.phone || payload.phone.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'El teléfono del candidato es obligatorio.',
    );
  }
}
