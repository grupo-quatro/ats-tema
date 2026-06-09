export interface ExchangeCalendarCodePayload {
  code: string;
  redirectUri: string;
}

export class ExchangeCalendarCodeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExchangeCalendarCodeValidationError';
  }
}

export function validateExchangeCalendarCodePayload(
  body: unknown,
): asserts body is ExchangeCalendarCodePayload {
  const payload = body as Partial<ExchangeCalendarCodePayload>;

  if (
    !payload.code ||
    typeof payload.code !== 'string' ||
    payload.code.trim().length === 0
  ) {
    throw new ExchangeCalendarCodeValidationError(
      'El campo code es obligatorio y debe ser un string no vacío.',
    );
  }

  if (
    !payload.redirectUri ||
    typeof payload.redirectUri !== 'string' ||
    payload.redirectUri.trim().length === 0
  ) {
    throw new ExchangeCalendarCodeValidationError(
      'El campo redirectUri es obligatorio y debe ser un string no vacío.',
    );
  }
}
