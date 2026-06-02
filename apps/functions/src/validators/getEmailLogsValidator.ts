export class GetEmailLogsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GetEmailLogsValidationError';
  }
}

export function validateGetEmailLogsPayload(
  query: Partial<{ candidateId: string }>,
): asserts query is { candidateId: string } {
  if (!query.candidateId || typeof query.candidateId !== 'string') {
    throw new GetEmailLogsValidationError('candidateId es requerido.');
  }
}
