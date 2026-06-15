import type {
  CandidatePostulationCVPayload,
  CandidatePostulationPayload,
  ConfirmCandidateProfilePayload,
  DiscardCandidateDraftPayload,
  GetCandidateProfileForConfirmationPayload,
} from '@ats/shared-types';
import { HttpsError } from 'firebase-functions/v2/https';

function validateExpectedMonthlySalaryArs(value: unknown): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new HttpsError(
      'invalid-argument',
      'El salario mensual pretendido en ARS es obligatorio.',
    );
  }
}

function validateLinkedinUrl(value: unknown): void {
  if (value === undefined || value === null || value === '') {
    return;
  }

  if (typeof value !== 'string') {
    throw new HttpsError(
      'invalid-argument',
      'La URL de LinkedIn debe ser un texto.',
    );
  }

  const trimmed = value.trim();
  const urlValue = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(urlValue);
    const hostname = url.hostname.toLowerCase();
    if (hostname !== 'linkedin.com' && !hostname.endsWith('.linkedin.com')) {
      throw new Error('Invalid LinkedIn URL');
    }
  } catch {
    throw new HttpsError(
      'invalid-argument',
      'La URL de LinkedIn no es valida.',
    );
  }
}

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
  validateExpectedMonthlySalaryArs(payload.expectedMonthlySalaryArs);
  validateLinkedinUrl(payload.linkedinUrl);
}

export function validateConfirmCandidateProfilePayload(
  payload: Partial<ConfirmCandidateProfilePayload>,
): asserts payload is ConfirmCandidateProfilePayload {
  if (!payload.candidateId || payload.candidateId.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'El candidateId es obligatorio.');
  }

  if (!payload.profile) {
    throw new HttpsError(
      'invalid-argument',
      'El perfil del candidato es obligatorio.',
    );
  }

  validateRegisterCandidatePayload({
    jobId: 'profile-confirmation',
    ...payload.profile,
  });
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
