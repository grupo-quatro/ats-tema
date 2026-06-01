import type {
  CandidatePostulationCVPayload,
  CandidatePostulationPayload,
  DiscardCandidateDraftPayload,
  GetCandidateProfileForConfirmationPayload,
} from '@ats/shared-types';
import { HttpsError } from 'firebase-functions/v2/https';

export function validateStartApplicationWithCVPayload(
  payload: Partial<CandidatePostulationCVPayload>,
): asserts payload is CandidatePostulationCVPayload {
  if (!payload.jobId || payload.jobId.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'La posición asociada a la postulación es obligatoria.',
    );
  }
}

export function validateRegisterCandidatePayload(
  payload: Partial<CandidatePostulationPayload>,
): asserts payload is CandidatePostulationPayload {
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

export function validateGetCandidateProfileForConfirmationPayload(
  payload: Partial<GetCandidateProfileForConfirmationPayload>,
): asserts payload is GetCandidateProfileForConfirmationPayload {
  if (!payload.candidateId || payload.candidateId.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'El candidateId es obligatorio.');
  }

  if (!payload.applicationId || payload.applicationId.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'El applicationId es obligatorio.',
    );
  }
}

export function validateDiscardCandidateDraftPayload(
  payload: Partial<DiscardCandidateDraftPayload>,
): asserts payload is DiscardCandidateDraftPayload {
  if (!payload.candidateId || payload.candidateId.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'El candidateId es obligatorio.');
  }

  if (!payload.applicationId || payload.applicationId.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'El applicationId es obligatorio.',
    );
  }
}
