import type {
  GetInterviewFormsPayload,
  InterviewFormType,
  SaveInterviewFormPayload,
} from '@ats/shared-types';

export class InterviewFormsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InterviewFormsValidationError';
  }
}

const VALID_TYPES: InterviewFormType[] = ['hr', 'tech'];

function isValidRating(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

export function validateSaveInterviewFormPayload(
  payload: Partial<SaveInterviewFormPayload>,
): asserts payload is SaveInterviewFormPayload {
  if (!payload.applicationId || payload.applicationId.trim().length === 0) {
    throw new InterviewFormsValidationError(
      'El identificador de la postulación (applicationId) es obligatorio.',
    );
  }

  if (!payload.type || !VALID_TYPES.includes(payload.type)) {
    throw new InterviewFormsValidationError(
      'El tipo de formulario debe ser "hr" o "tech".',
    );
  }

  if (!payload.title || payload.title.trim().length === 0) {
    throw new InterviewFormsValidationError(
      'El título del formulario es obligatorio.',
    );
  }

  if (
    payload.overallRating === undefined ||
    !isValidRating(payload.overallRating)
  ) {
    throw new InterviewFormsValidationError(
      'La calificación general es obligatoria y debe ser un entero entre 1 y 5.',
    );
  }

  if (!payload.decision || payload.decision.trim().length === 0) {
    throw new InterviewFormsValidationError(
      'La decisión recomendada es obligatoria.',
    );
  }

  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    throw new InterviewFormsValidationError(
      'El formulario debe incluir al menos una pregunta.',
    );
  }

  payload.questions.forEach((item, index) => {
    if (!item.question || item.question.trim().length === 0) {
      throw new InterviewFormsValidationError(
        `La pregunta ${index + 1} es obligatoria.`,
      );
    }

    const hasAnswer = Boolean(item.answer && item.answer.trim().length > 0);
    const hasRating = item.rating !== undefined && isValidRating(item.rating);

    if (!hasAnswer && !hasRating) {
      throw new InterviewFormsValidationError(
        `La pregunta ${index + 1} debe tener respuesta o calificación.`,
      );
    }

    if (item.rating !== undefined && !isValidRating(item.rating)) {
      throw new InterviewFormsValidationError(
        `La calificación de la pregunta ${index + 1} debe ser un entero entre 1 y 5.`,
      );
    }
  });

  const commentsQuestion = payload.questions.find((item) =>
    item.question.toLowerCase().includes('comentarios'),
  );

  if (
    !commentsQuestion?.answer ||
    commentsQuestion.answer.trim().length === 0
  ) {
    throw new InterviewFormsValidationError(
      'Los comentarios y observaciones son obligatorios.',
    );
  }
}

export function validateGetInterviewFormsPayload(
  payload: Partial<GetInterviewFormsPayload>,
): asserts payload is GetInterviewFormsPayload {
  if (!payload.applicationId || payload.applicationId.trim().length === 0) {
    throw new InterviewFormsValidationError(
      'El identificador de la postulación (applicationId) es obligatorio.',
    );
  }
}
