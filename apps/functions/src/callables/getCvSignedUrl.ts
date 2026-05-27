import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import type { GetCvSignedUrlPayload, GetCvSignedUrlResponse } from '@ats/shared-types';

import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import { ApplicationsRepository } from '../repositories/applicationRepository';
import { CandidatesRepository } from '../repositories/candidateRepository';

const applicationsRepository = new ApplicationsRepository();
const candidatesRepository = new CandidatesRepository();

export const getCvSignedUrl = onRequest(async (request, response) => {
  try {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    await requireAuthenticatedUser(request);

    const payload = request.query as Partial<GetCvSignedUrlPayload>;

    if (!payload.applicationId?.trim()) {
      response.status(400).json({ error: 'applicationId es obligatorio.' });
      return;
    }

    const application = await applicationsRepository.findById(payload.applicationId.trim());
    if (!application) {
      response.status(404).json({ error: 'Postulación no encontrada.' });
      return;
    }

    const candidate = await candidatesRepository.findById(application.candidateId);
    if (!candidate?.cvStoragePath) {
      response.status(404).json({ error: 'Este candidato no tiene CV cargado.' });
      return;
    }

    const result: GetCvSignedUrlResponse = { cvStoragePath: candidate.cvStoragePath };
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    logger.error('[getCvSignedUrl] Error obteniendo CV', error);
    response.status(500).json({ error: 'No se pudo obtener el CV.' });
  }
});
