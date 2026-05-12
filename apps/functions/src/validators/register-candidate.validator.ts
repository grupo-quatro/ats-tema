import type {
  RegisterCandidatePayload,
  RegisterCandidateResponse,
} from "@ats/shared-types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class RegisterCandidateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegisterCandidateValidationError";
  }
}

export function validateRegisterCandidatePayload(
  payload: unknown,
): RegisterCandidatePayload {
  if (!isObject(payload)) {
    throw new RegisterCandidateValidationError(
      "El payload de registerCandidate debe ser un objeto.",
    );
  }

  const fullName = normalizeRequiredString(payload.fullName, "fullName");
  const email = normalizeEmail(payload.email);
  const hasCv = normalizeRequiredBoolean(payload.hasCv, "hasCv");

  return {
    fullName,
    email,
    hasCv,
    jobId: normalizeOptionalString(payload.jobId, "jobId"),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new RegisterCandidateValidationError(
      `El campo ${fieldName} es obligatorio y debe ser string.`,
    );
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new RegisterCandidateValidationError(
      `El campo ${fieldName} es obligatorio.`,
    );
  }

  return normalizedValue;
}

function normalizeOptionalString(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new RegisterCandidateValidationError(
      `El campo ${fieldName} debe ser string si se envia.`,
    );
  }

  const normalizedValue = value.trim();

  return normalizedValue || undefined;
}

function normalizeEmail(value: unknown): string {
  const normalizedEmail = normalizeRequiredString(value, "email").toLowerCase();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new RegisterCandidateValidationError(
      "El campo email debe tener un formato valido.",
    );
  }

  return normalizedEmail;
}

function normalizeRequiredBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new RegisterCandidateValidationError(
      `El campo ${fieldName} es obligatorio y debe ser boolean.`,
    );
  }

  return value;
}
