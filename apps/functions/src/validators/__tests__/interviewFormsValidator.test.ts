import { describe, it, expect } from 'vitest';
import {
  InterviewFormsValidationError,
  validateGetInterviewFormsPayload,
  validateSaveInterviewFormPayload,
} from '../interviewFormsValidator';

const validSavePayload = {
  applicationId: 'app-1',
  type: 'hr' as const,
  title: 'Evaluación RRHH',
  overallRating: 4,
  decision: 'Avanzar',
  questions: [
    { question: 'Comunicación', answer: 'Buena', rating: 4 },
    { question: 'Decisión', answer: 'Avanzar' },
    { question: 'Comentarios y observaciones', answer: 'Muy buen perfil.' },
  ],
};

describe('validateSaveInterviewFormPayload', () => {
  it('no lanza cuando el payload es válido', () => {
    expect(() =>
      validateSaveInterviewFormPayload(validSavePayload),
    ).not.toThrow();
  });

  it('lanza cuando applicationId está ausente', () => {
    expect(() =>
      validateSaveInterviewFormPayload({
        ...validSavePayload,
        applicationId: '',
      }),
    ).toThrow(InterviewFormsValidationError);
  });

  it('lanza cuando type es inválido', () => {
    expect(() =>
      validateSaveInterviewFormPayload({
        ...validSavePayload,
        type: 'invalid' as 'hr',
      }),
    ).toThrow(InterviewFormsValidationError);
  });

  it('lanza cuando title está vacío', () => {
    expect(() =>
      validateSaveInterviewFormPayload({
        ...validSavePayload,
        title: '   ',
      }),
    ).toThrow(InterviewFormsValidationError);
  });

  it('lanza cuando questions está vacío', () => {
    expect(() =>
      validateSaveInterviewFormPayload({
        ...validSavePayload,
        questions: [],
      }),
    ).toThrow(InterviewFormsValidationError);
  });

  it('lanza cuando overallRating está fuera de rango', () => {
    expect(() =>
      validateSaveInterviewFormPayload({
        ...validSavePayload,
        overallRating: 6,
      }),
    ).toThrow(InterviewFormsValidationError);
  });

  it('acepta pregunta solo con rating si incluye comentarios', () => {
    expect(() =>
      validateSaveInterviewFormPayload({
        ...validSavePayload,
        questions: [
          { question: 'Comunicación', answer: '', rating: 3 },
          { question: 'Comentarios y observaciones', answer: 'Observación.' },
        ],
      }),
    ).not.toThrow();
  });

  it('lanza cuando pregunta no tiene respuesta ni rating', () => {
    expect(() =>
      validateSaveInterviewFormPayload({
        ...validSavePayload,
        questions: [
          { question: 'Comunicación', answer: '' },
          { question: 'Comentarios y observaciones', answer: 'Ok' },
        ],
      }),
    ).toThrow(InterviewFormsValidationError);
  });

  it('lanza cuando falta decisión', () => {
    expect(() =>
      validateSaveInterviewFormPayload({
        ...validSavePayload,
        decision: '   ',
      }),
    ).toThrow(InterviewFormsValidationError);
  });

  it('lanza cuando faltan comentarios y observaciones', () => {
    expect(() =>
      validateSaveInterviewFormPayload({
        ...validSavePayload,
        questions: validSavePayload.questions.filter(
          (q) => !q.question.toLowerCase().includes('comentarios'),
        ),
      }),
    ).toThrow(InterviewFormsValidationError);
  });
});

describe('validateGetInterviewFormsPayload', () => {
  it('no lanza cuando applicationId es válido', () => {
    expect(() =>
      validateGetInterviewFormsPayload({ applicationId: 'app-1' }),
    ).not.toThrow();
  });

  it('lanza cuando applicationId está ausente', () => {
    expect(() => validateGetInterviewFormsPayload({})).toThrow(
      InterviewFormsValidationError,
    );
  });
});
