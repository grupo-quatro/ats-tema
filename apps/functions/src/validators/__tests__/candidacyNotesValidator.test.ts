import { describe, it, expect } from 'vitest';
import {
  CandidacyNotesValidationError,
  validateGetCandidacyNotesPayload,
  validateSaveCandidacyNotePayload,
  validateUpdateCandidacyNotePayload,
} from '../candidacyNotesValidator';

describe('validateSaveCandidacyNotePayload', () => {
  it('no lanza cuando el payload es válido', () => {
    expect(() =>
      validateSaveCandidacyNotePayload({
        applicationId: 'app-1',
        text: 'Buen perfil cultural',
      }),
    ).not.toThrow();
  });

  it('lanza cuando applicationId está ausente', () => {
    expect(() =>
      validateSaveCandidacyNotePayload({ text: 'Nota' }),
    ).toThrow(CandidacyNotesValidationError);
  });

  it('lanza cuando text está vacío', () => {
    expect(() =>
      validateSaveCandidacyNotePayload({
        applicationId: 'app-1',
        text: '   ',
      }),
    ).toThrow(CandidacyNotesValidationError);
  });
});

describe('validateUpdateCandidacyNotePayload', () => {
  it('no lanza cuando el payload es válido', () => {
    expect(() =>
      validateUpdateCandidacyNotePayload({
        applicationId: 'app-1',
        id: 'note-1',
        text: 'Texto actualizado',
      }),
    ).not.toThrow();
  });

  it('lanza cuando id está ausente', () => {
    expect(() =>
      validateUpdateCandidacyNotePayload({
        applicationId: 'app-1',
        text: 'Nota',
      }),
    ).toThrow(CandidacyNotesValidationError);
  });
});

describe('validateGetCandidacyNotesPayload', () => {
  it('no lanza cuando applicationId es válido', () => {
    expect(() =>
      validateGetCandidacyNotesPayload({ applicationId: 'app-1' }),
    ).not.toThrow();
  });

  it('lanza cuando applicationId está ausente', () => {
    expect(() => validateGetCandidacyNotesPayload({})).toThrow(
      CandidacyNotesValidationError,
    );
  });
});
