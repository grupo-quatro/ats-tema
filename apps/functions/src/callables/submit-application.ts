import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import type { SubmitApplicationPayload } from '@ats/shared-types';

import {
  ApplicationAlreadyExistsError,
  CandidateNotFoundError,
  JobNotFoundError,
  JobNotOpenError,
} from '../services/submit-application-errors';
import { SubmitApplicationService } from '../services/submit-application-service';
import { validateSubmitApplicationPayload } from '../validators/submit-application-validator';
import { HttpAuthError, requireAuthenticatedUser } from '../core/http-auth';

const submitApplicationService = new SubmitApplicationService();

export const submitApplication = onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const candidateId = await requireAuthenticatedUser(req);

    const payload = req.body as Partial<SubmitApplicationPayload>;
    validateSubmitApplicationPayload(payload);

    const result = await submitApplicationService.submitApplication(
      candidateId,
      payload.jobId,
    );
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      res.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof CandidateNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error instanceof JobNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error instanceof JobNotOpenError) {
      res.status(422).json({ error: error.message });
      return;
    }

    if (error instanceof ApplicationAlreadyExistsError) {
      res.status(409).json({ error: error.message });
      return;
    }

    logger.error('Error inesperado al registrar postulación', error);
    res.status(500).json({ error: 'No se pudo registrar la postulación.' });
  }
});
