import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import type {
  CreateOfferDraftPayload,
  EmployeeRole,
  RespondOfferPayload,
  SendOfferPayload,
} from '@ats/shared-types';

import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import {
  OfferInvalidStateError,
  OfferNotFoundError,
  OfferService,
  OfferUnauthorizedStateError,
} from '../services/offerService';
import {
  OfferValidationError,
  validateCreateOfferDraftPayload,
  validateGetOfferByApplicationPayload,
  validateGetOfferByTokenPayload,
  validateRespondOfferPayload,
  validateSendOfferPayload,
} from '../validators/offerValidator';

const offerService = new OfferService();
const OFFER_MANAGER_ROLES: EmployeeRole[] = ['admin', 'hr', 'hiring_manager'];

export const createOfferDraft = onRequest(async (request, response) => {
  try {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const { uid, role } = await requireAuthenticatedUser(request);
    assertCanManageOffers(role);

    const payload = request.body as Partial<CreateOfferDraftPayload>;
    validateCreateOfferDraftPayload(payload);

    const result = await offerService.createDraft(payload, uid);
    response.status(201).json(result);
  } catch (error) {
    handleOfferError(response, error, '[createOfferDraft]');
  }
});

export const sendOffer = onRequest(async (request, response) => {
  try {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const { uid, role } = await requireAuthenticatedUser(request);
    assertCanManageOffers(role);

    const payload = request.body as Partial<SendOfferPayload>;
    validateSendOfferPayload(payload);

    const result = await offerService.sendOffer(payload, uid);
    response.status(200).json(result);
  } catch (error) {
    handleOfferError(response, error, '[sendOffer]');
  }
});

export const getOfferByToken = onRequest(async (request, response) => {
  try {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const payload = {
      token: getQueryString(request.query.token),
    };
    validateGetOfferByTokenPayload(payload);

    const result = await offerService.getPublicOffer(payload.token);
    response.status(200).json(result);
  } catch (error) {
    handleOfferError(response, error, '[getOfferByToken]');
  }
});

export const getOfferByApplication = onRequest(async (request, response) => {
  try {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const { role } = await requireAuthenticatedUser(request);
    assertCanManageOffers(role);

    const payload = {
      applicationId: getQueryString(request.query.applicationId),
    };
    validateGetOfferByApplicationPayload(payload);

    const result = await offerService.getOfferByApplication(
      payload.applicationId,
    );
    response.status(200).json(result);
  } catch (error) {
    handleOfferError(response, error, '[getOfferByApplication]');
  }
});

export const respondOffer = onRequest(async (request, response) => {
  try {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const payload = request.body as Partial<RespondOfferPayload>;
    validateRespondOfferPayload(payload);

    const result = await offerService.respondToOffer(payload, {
      ip: request.ip,
      userAgent: request.header('user-agent'),
    });
    response.status(200).json(result);
  } catch (error) {
    handleOfferError(response, error, '[respondOffer]');
  }
});

function assertCanManageOffers(role: EmployeeRole | null): void {
  if (!role || !OFFER_MANAGER_ROLES.includes(role)) {
    throw new OfferUnauthorizedStateError(
      'No tenés permisos para gestionar cartas oferta.',
    );
  }
}

function getQueryString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function handleOfferError(
  response: HttpResponseLike,
  error: unknown,
  logPrefix: string,
): void {
  if (error instanceof HttpAuthError) {
    response.status(401).json({ error: error.message });
    return;
  }

  if (error instanceof OfferValidationError) {
    response.status(400).json({ error: error.message });
    return;
  }

  if (error instanceof OfferNotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }

  if (error instanceof OfferUnauthorizedStateError) {
    response.status(403).json({ error: error.message });
    return;
  }

  if (error instanceof OfferInvalidStateError) {
    response.status(409).json({ error: error.message });
    return;
  }

  logger.error(`${logPrefix} Error inesperado gestionando carta oferta`, error);
  response.status(500).json({ error: 'No se pudo procesar la carta oferta.' });
}

type HttpResponseLike = {
  status(code: number): {
    json(body: unknown): void;
  };
};
