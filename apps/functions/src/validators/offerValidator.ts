import type {
  CreateOfferDraftPayload,
  RespondOfferPayload,
  SendOfferPayload,
} from '@ats/shared-types';

export class OfferValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfferValidationError';
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateCreateOfferDraftPayload(
  payload: Partial<CreateOfferDraftPayload>,
): asserts payload is CreateOfferDraftPayload {
  if (!isNonEmptyString(payload.applicationId)) {
    throw new OfferValidationError('El applicationId es obligatorio.');
  }

  if (payload.benefits !== undefined && !Array.isArray(payload.benefits)) {
    throw new OfferValidationError('El campo benefits debe ser un array.');
  }
}

export function validateSendOfferPayload(
  payload: Partial<SendOfferPayload>,
): asserts payload is SendOfferPayload {
  if (!isNonEmptyString(payload.offerId)) {
    throw new OfferValidationError('El offerId es obligatorio.');
  }
}

export function validateGetOfferByTokenPayload(
  payload: Partial<{ token: string }>,
): asserts payload is { token: string } {
  if (!isNonEmptyString(payload.token)) {
    throw new OfferValidationError('El token de oferta es obligatorio.');
  }
}

export function validateGetOfferByApplicationPayload(
  payload: Partial<{ applicationId: string }>,
): asserts payload is { applicationId: string } {
  if (!isNonEmptyString(payload.applicationId)) {
    throw new OfferValidationError('El applicationId es obligatorio.');
  }
}

export function validateRespondOfferPayload(
  payload: Partial<RespondOfferPayload>,
): asserts payload is RespondOfferPayload {
  if (!isNonEmptyString(payload.token)) {
    throw new OfferValidationError('El token de oferta es obligatorio.');
  }

  if (payload.action !== 'accept' && payload.action !== 'decline') {
    throw new OfferValidationError('La acción debe ser "accept" o "decline".');
  }

  if (payload.action === 'accept' && !isNonEmptyString(payload.signerName)) {
    throw new OfferValidationError(
      'El nombre del firmante es obligatorio para aceptar la oferta.',
    );
  }
}
