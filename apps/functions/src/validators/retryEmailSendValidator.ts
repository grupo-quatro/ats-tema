export class RetryEmailSendValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryEmailSendValidationError';
  }
}

export function validateRetryEmailSendPayload(
  body: Partial<{ logId: string }>,
): asserts body is { logId: string } {
  if (!body.logId || typeof body.logId !== 'string') {
    throw new RetryEmailSendValidationError('logId es requerido.');
  }
}
