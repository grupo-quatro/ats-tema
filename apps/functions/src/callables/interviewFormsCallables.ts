import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import type { SaveInterviewFormPayload } from '@ats/shared-types';

import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import {
  InterviewFormForbiddenError,
  InterviewFormsService,
} from '../services/interviewFormsService';
import { ApplicationNotFoundError } from '../services/updateApplicationService';
import {
  InterviewFormsValidationError,
  validateGetInterviewFormsPayload,
  validateSaveInterviewFormPayload,
} from '../validators/interviewFormsValidator';

const interviewFormsService = new InterviewFormsService();

export const saveInterviewForm = onRequest(async (request, response) => {
  try {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const caller = await requireAuthenticatedUser(request);

    const payload = request.body as Partial<SaveInterviewFormPayload>;
    validateSaveInterviewFormPayload(payload);

    const result = await interviewFormsService.saveInterviewForm(
      payload,
      caller,
    );

    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof InterviewFormsValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof ApplicationNotFoundError) {
      response.status(404).json({ error: error.message });
      return;
    }

    if (error instanceof InterviewFormForbiddenError) {
      response.status(403).json({ error: error.message });
      return;
    }

    logger.error('Error inesperado guardando formulario de entrevista', error);
    response.status(500).json({ error: 'No se pudo guardar el formulario.' });
  }
});

export const getInterviewForms = onRequest(async (request, response) => {
  try {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const caller = await requireAuthenticatedUser(request);

    const applicationId =
      typeof request.query.applicationId === 'string'
        ? request.query.applicationId.trim()
        : undefined;

    const payload = { applicationId };
    validateGetInterviewFormsPayload(payload);

    const result = await interviewFormsService.getInterviewForms(
      payload.applicationId,
      caller,
    );

    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof InterviewFormsValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof ApplicationNotFoundError) {
      response.status(404).json({ error: error.message });
      return;
    }

    logger.error(
      'Error inesperado obteniendo formularios de entrevista',
      error,
    );
    response
      .status(500)
      .json({ error: 'No se pudieron obtener los formularios.' });
  }
});
