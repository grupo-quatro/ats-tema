export interface ExchangeGmailCodePayload {
  code: string;
  redirectUri: string;
}

export class ExchangeGmailCodeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExchangeGmailCodeValidationError';
  }
}

export function validateExchangeGmailCodePayload(
  body: unknown,
): asserts body is ExchangeGmailCodePayload {
  const payload = body as Partial<ExchangeGmailCodePayload>;

  if (
    !payload.code ||
    typeof payload.code !== 'string' ||
    payload.code.trim().length === 0
  ) {
    throw new ExchangeGmailCodeValidationError(
      'El campo code es obligatorio y debe ser un string no vacío.',
    );
  }

  if (
    !payload.redirectUri ||
    typeof payload.redirectUri !== 'string' ||
    payload.redirectUri.trim().length === 0
  ) {
    throw new ExchangeGmailCodeValidationError(
      'El campo redirectUri es obligatorio y debe ser un string no vacío.',
    );
  }
}
