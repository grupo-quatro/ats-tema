import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import type {
  SaveCandidacyNotePayload,
  UpdateCandidacyNotePayload,
} from '@ats/shared-types';

import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import {
  CandidacyNoteForbiddenError,
  CandidacyNoteNotFoundError,
  CandidacyNoteTerminalStageError,
  CandidacyNotesService,
} from '../services/candidacyNotesService';
import { ApplicationNotFoundError } from '../services/updateApplicationService';
import {
  CandidacyNotesValidationError,
  validateGetCandidacyNotesPayload,
  validateSaveCandidacyNotePayload,
  validateUpdateCandidacyNotePayload,
} from '../validators/candidacyNotesValidator';

const candidacyNotesService = new CandidacyNotesService();

export const saveCandidacyNote = onRequest(async (request, response) => {
  try {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const caller = await requireAuthenticatedUser(request);

    const payload = request.body as Partial<SaveCandidacyNotePayload>;
    validateSaveCandidacyNotePayload(payload);

    const result = await candidacyNotesService.saveCandidacyNote(
      payload,
      caller,
    );

    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof CandidacyNotesValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof ApplicationNotFoundError) {
      response.status(404).json({ error: error.message });
      return;
    }

    if (error instanceof CandidacyNoteNotFoundError) {
      response.status(404).json({ error: error.message });
      return;
    }

    if (error instanceof CandidacyNoteForbiddenError) {
      response.status(403).json({ error: error.message });
      return;
    }

    if (error instanceof CandidacyNoteTerminalStageError) {
      response.status(409).json({ error: error.message });
      return;
    }

    logger.error('Error inesperado guardando nota de candidatura', error);
    response.status(500).json({ error: 'No se pudo guardar la nota.' });
  }
});

export const getCandidacyNotes = onRequest(async (request, response) => {
  try {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    await requireAuthenticatedUser(request);

    const applicationId =
      typeof request.query.applicationId === 'string'
        ? request.query.applicationId.trim()
        : undefined;

    const payload = { applicationId };
    validateGetCandidacyNotesPayload(payload);

    const result = await candidacyNotesService.getCandidacyNotes(
      payload.applicationId,
    );

    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof CandidacyNotesValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof ApplicationNotFoundError) {
      response.status(404).json({ error: error.message });
      return;
    }

    logger.error('Error inesperado obteniendo notas de candidatura', error);
    response.status(500).json({ error: 'No se pudieron obtener las notas.' });
  }
});

export const updateCandidacyNote = onRequest(async (request, response) => {
  try {
    if (request.method !== 'PATCH') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const caller = await requireAuthenticatedUser(request);

    const payload = request.body as Partial<UpdateCandidacyNotePayload>;
    validateUpdateCandidacyNotePayload(payload);

    const result = await candidacyNotesService.updateCandidacyNote(
      payload,
      caller,
    );

    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof CandidacyNotesValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }

    if (error instanceof ApplicationNotFoundError) {
      response.status(404).json({ error: error.message });
      return;
    }

    if (error instanceof CandidacyNoteNotFoundError) {
      response.status(404).json({ error: error.message });
      return;
    }

    if (error instanceof CandidacyNoteForbiddenError) {
      response.status(403).json({ error: error.message });
      return;
    }

    if (error instanceof CandidacyNoteTerminalStageError) {
      response.status(409).json({ error: error.message });
      return;
    }

    logger.error('Error inesperado actualizando nota de candidatura', error);
    response.status(500).json({ error: 'No se pudo actualizar la nota.' });
  }
});
