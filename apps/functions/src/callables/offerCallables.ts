import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import {
  EMPLOYEE_ROLES,
  type CreateOfferDraftPayload,
  type EmployeeRole,
  type PreviewOfferPayload,
  type RespondOfferPayload,
  type SendOfferPayload,
  type UpdateOfferDraftPayload,
} from '@ats/shared-types';
import { OAuth2Client } from 'google-auth-library';

import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import { oauthEncryptionKey } from '../core/secrets';
import { EmailLogRepository } from '../repositories/emailLogRepository';
import { EmailTemplateRepository } from '../repositories/emailTemplateRepository';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { OrgConfigRepository } from '../repositories/orgConfigRepository';
import { UserRepository } from '../repositories/userRepository';
import { GmailSenderService } from '../services/gmailSenderService';
import {
  OfferEmailSendError,
  OfferInvalidStateError,
  OfferNotFoundError,
  OfferService,
  OfferUnauthorizedStateError,
} from '../services/offerService';
import { StageEmailService } from '../services/stageEmailService';
import { TemplateResolverService } from '../services/templateResolverService';
import {
  OfferValidationError,
  validateCreateOfferDraftPayload,
  validateGetOfferByApplicationPayload,
  validateGetOfferByTokenPayload,
  validatePreviewOfferPayload,
  validateRespondOfferPayload,
  validateSendOfferPayload,
  validateUpdateOfferDraftPayload,
} from '../validators/offerValidator';

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
);
const offerService = new OfferService(
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  new StageEmailService(
    new EmailTemplateRepository(),
    new EmailLogRepository(),
    new UserRepository(),
    new OrgConfigRepository(),
    new TemplateResolverService(),
    new GmailSenderService(),
    oauth2Client,
    new EmployeeRepository(),
  ),
);
const OFFER_MANAGER_ROLES: EmployeeRole[] = [
  EMPLOYEE_ROLES.ADMIN,
  EMPLOYEE_ROLES.HR,
  EMPLOYEE_ROLES.AREA_LEADER,
];

export const createOfferDraft = onRequest(
  { secrets: [oauthEncryptionKey] },
  async (request, response) => {
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
  },
);

export const sendOffer = onRequest(
  { secrets: [oauthEncryptionKey] },
  async (request, response) => {
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
  },
);

export const updateOfferDraft = onRequest(
  { secrets: [oauthEncryptionKey] },
  async (request, response) => {
    try {
      if (request.method !== 'PUT') {
        response.status(405).json({ error: 'Method Not Allowed.' });
        return;
      }

      const { role } = await requireAuthenticatedUser(request);
      assertCanManageOffers(role);

      const payload = request.body as Partial<UpdateOfferDraftPayload>;
      validateUpdateOfferDraftPayload(payload);

      const result = await offerService.updateDraft(payload);
      response.status(200).json(result);
    } catch (error) {
      handleOfferError(response, error, '[updateOfferDraft]');
    }
  },
);

export const previewOffer = onRequest(
  { secrets: [oauthEncryptionKey] },
  async (request, response) => {
    try {
      if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method Not Allowed.' });
        return;
      }

      const { role } = await requireAuthenticatedUser(request);
      assertCanManageOffers(role);

      const payload = request.body as Partial<PreviewOfferPayload>;
      validatePreviewOfferPayload(payload);

      const result = await offerService.previewOffer(payload);
      response.status(200).json(result);
    } catch (error) {
      handleOfferError(response, error, '[previewOffer]');
    }
  },
);

export const getOfferByToken = onRequest(
  { secrets: [oauthEncryptionKey] },
  async (request, response) => {
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
  },
);

export const getOfferByApplication = onRequest(
  { secrets: [oauthEncryptionKey] },
  async (request, response) => {
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
  },
);

export const respondOffer = onRequest(
  { secrets: [oauthEncryptionKey] },
  async (request, response) => {
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
  },
);

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

  if (error instanceof OfferEmailSendError) {
    response.status(502).json({ error: error.message });
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
