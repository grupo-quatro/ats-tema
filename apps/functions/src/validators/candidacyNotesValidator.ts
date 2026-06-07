import type {
  GetCandidacyNotesPayload,
  SaveCandidacyNotePayload,
  UpdateCandidacyNotePayload,
} from '@ats/shared-types';

export class CandidacyNotesValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CandidacyNotesValidationError';
  }
}

export function validateSaveCandidacyNotePayload(
  payload: Partial<SaveCandidacyNotePayload>,
): asserts payload is SaveCandidacyNotePayload {
  if (!payload.applicationId || payload.applicationId.trim().length === 0) {
    throw new CandidacyNotesValidationError(
      'El identificador de la postulación (applicationId) es obligatorio.',
    );
  }

  if (!payload.text || payload.text.trim().length === 0) {
    throw new CandidacyNotesValidationError(
      'El texto de la nota es obligatorio.',
    );
  }
}

export function validateUpdateCandidacyNotePayload(
  payload: Partial<UpdateCandidacyNotePayload>,
): asserts payload is UpdateCandidacyNotePayload {
  if (!payload.applicationId || payload.applicationId.trim().length === 0) {
    throw new CandidacyNotesValidationError(
      'El identificador de la postulación (applicationId) es obligatorio.',
    );
  }

  if (!payload.id || payload.id.trim().length === 0) {
    throw new CandidacyNotesValidationError(
      'El identificador de la nota (id) es obligatorio.',
    );
  }

  if (!payload.text || payload.text.trim().length === 0) {
    throw new CandidacyNotesValidationError(
      'El texto de la nota es obligatorio.',
    );
  }
}

export function validateGetCandidacyNotesPayload(
  payload: Partial<GetCandidacyNotesPayload>,
): asserts payload is GetCandidacyNotesPayload {
  if (!payload.applicationId || payload.applicationId.trim().length === 0) {
    throw new CandidacyNotesValidationError(
      'El identificador de la postulación (applicationId) es obligatorio.',
    );
  }
}
