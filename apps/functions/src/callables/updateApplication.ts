import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import {
  EMPLOYEE_ROLES,
  STAGE_CONFIG,
  type EmployeeRole,
  type PreviewApplicationStageEmailPayload,
  type UpdateApplicationStagePayload,
} from '@ats/shared-types';
import { OAuth2Client } from 'google-auth-library';
import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import { setCorsHeaders } from '../core/cors';
import { oauthEncryptionKey } from '../core/secrets';
import { ApplicationsRepository } from '../repositories/applicationRepository';
import { EmailLogRepository } from '../repositories/emailLogRepository';
import { EmailTemplateRepository } from '../repositories/emailTemplateRepository';
import { OrgConfigRepository } from '../repositories/orgConfigRepository';
import { UserRepository } from '../repositories/userRepository';
import { EmployeeRepository } from '../repositories/employeeRepository';
import {
  ApplicationNotFoundError,
  ApplicationStageTransitionError,
  UpdateApplicationStageService,
} from '../services/updateApplicationService';
import { GmailSenderService } from '../services/gmailSenderService';
import { StageEmailService } from '../services/stageEmailService';
import { TemplateResolverService } from '../services/templateResolverService';
import {
  validateUpdateApplicationStagePayload,
  UpdateApplicationValidationError,
} from '../validators/updateApplicationValidator';

interface UpdateApplicationPayload {
  applicationId: string;
  fortalezas: string[];
}

class ApplicationStageForbiddenError extends Error {
  constructor() {
    super('No tenés permisos para cambiar la etapa del candidato.');
    this.name = 'ApplicationStageForbiddenError';
  }
}

const OFFER_MANAGER_ROLES: EmployeeRole[] = [
  EMPLOYEE_ROLES.ADMIN,
  EMPLOYEE_ROLES.HR,
  EMPLOYEE_ROLES.AREA_LEADER,
];

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
);

//TODO: this coudl be a factory method
const applicationsRepository = new ApplicationsRepository();
const updateApplicationStageService = new UpdateApplicationStageService(
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

export const updateApplication = onRequest(
  { secrets: [oauthEncryptionKey] },
  async (request, response) => {
    try {
      if (request.method !== 'PATCH') {
        response.status(405).json({ error: 'Method Not Allowed.' });
        return;
      }

      await requireAuthenticatedUser(request);

      const payload = request.body as Partial<UpdateApplicationPayload>;

      if (!payload.applicationId || payload.applicationId.trim().length === 0) {
        response
          .status(400)
          .json({ error: 'El campo applicationId es obligatorio.' });
        return;
      }

      if (!Array.isArray(payload.fortalezas)) {
        response
          .status(400)
          .json({ error: 'El campo fortalezas debe ser un array de strings.' });
        return;
      }

      const fortalezas = payload.fortalezas
        .filter(
          (f): f is string => typeof f === 'string' && f.trim().length > 0,
        )
        .map((f) => f.trim());

      await applicationsRepository.update(payload.applicationId.trim(), {
        fortalezas,
      });

      logger.info('[updateApplication] Fortalezas actualizadas', {
        applicationId: payload.applicationId,
        total: fortalezas.length,
      });

      response.status(200).json({ success: true, fortalezas });
    } catch (error) {
      if (error instanceof HttpAuthError) {
        response.status(401).json({ error: error.message });
        return;
      }

      logger.error('[updateApplication] Error actualizando postulación', error);
      response
        .status(500)
        .json({ error: 'No se pudo actualizar la postulación.' });
    }
  },
);

export const updateApplicationStage = onRequest(
  { secrets: [oauthEncryptionKey] },
  async (request, response) => {
    setCorsHeaders(response);
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }
    try {
      if (request.method !== 'PATCH') {
        response.status(405).json({ error: 'Method Not Allowed.' });
        return;
      }

      const { uid, role } = await requireAuthenticatedUser(request);

      const payload = request.body as Partial<UpdateApplicationStagePayload>;
      validateUpdateApplicationStagePayload(payload);
      assertCanUpdateApplicationStage(role, payload.stage);

      const result = await updateApplicationStageService.updateStage(
        payload,
        uid,
      );

      response.status(200).json(result);
    } catch (error) {
      if (error instanceof HttpAuthError) {
        response.status(401).json({ error: error.message });
        return;
      }

      if (error instanceof ApplicationNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }

      if (error instanceof UpdateApplicationValidationError) {
        response.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof ApplicationStageForbiddenError) {
        response.status(403).json({ error: error.message });
        return;
      }

      if (error instanceof ApplicationStageTransitionError) {
        response.status(409).json({ error: error.message });
        return;
      }

      logger.error('Error inesperado actualizando etapa de postulación', error);
      response
        .status(500)
        .json({ error: 'No se pudo actualizar la postulación.' });
    }
  },
);

export const previewApplicationStageEmail = onRequest(
  { secrets: [oauthEncryptionKey] },
  async (request, response) => {
    setCorsHeaders(response);
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }
    try {
      if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method Not Allowed.' });
        return;
      }

      const { uid, role } = await requireAuthenticatedUser(request);

      const payload =
        request.body as Partial<PreviewApplicationStageEmailPayload>;
      validateUpdateApplicationStagePayload(payload);
      assertCanUpdateApplicationStage(role, payload.stage);

      const result = await updateApplicationStageService.previewStageEmail(
        payload,
        uid,
      );

      response.status(200).json(result);
    } catch (error) {
      if (error instanceof HttpAuthError) {
        response.status(401).json({ error: error.message });
        return;
      }

      if (error instanceof ApplicationNotFoundError) {
        response.status(404).json({ error: error.message });
        return;
      }

      if (error instanceof UpdateApplicationValidationError) {
        response.status(400).json({ error: error.message });
        return;
      }

      if (error instanceof ApplicationStageForbiddenError) {
        response.status(403).json({ error: error.message });
        return;
      }

      if (error instanceof ApplicationStageTransitionError) {
        response.status(409).json({ error: error.message });
        return;
      }

      logger.error(
        'Error inesperado previsualizando email de etapa de postulación',
        error,
      );
      response.status(500).json({
        error: 'No se pudo previsualizar el email de cambio de etapa.',
      });
    }
  },
);

function assertCanUpdateApplicationStage(
  role: EmployeeRole | null,
  stage: UpdateApplicationStagePayload['stage'],
): void {
  if (stage === 'hired' && role && OFFER_MANAGER_ROLES.includes(role)) {
    return;
  }

  if (STAGE_CONFIG[stage].transitionMode !== 'recruiter_action') {
    return;
  }

  if (role !== EMPLOYEE_ROLES.HR) {
    throw new ApplicationStageForbiddenError();
  }
}
