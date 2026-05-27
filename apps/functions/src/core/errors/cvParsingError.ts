export class CvParsingError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CvParsingError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      cause: serializeError(this.cause),
    };
  }
}

export function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    const details = error as Error & {
      code?: unknown;
      status?: unknown;
      response?: unknown;
      cause?: unknown;
    };

    return {
      name: error.name,
      message: error.message,
      code: details.code,
      status: details.status,
      response: details.response,
      cause: serializeError(details.cause),
    };
  }

  if (typeof error === 'object' && error !== null) {
    return JSON.parse(JSON.stringify(error));
  }

  return error;
}
