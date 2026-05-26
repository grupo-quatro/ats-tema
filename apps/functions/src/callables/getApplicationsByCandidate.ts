import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

import type { GetApplicationsByCandidatePayload } from '@ats/shared-types';

import {
  GetApplicationsByCandidateService,
  GetApplicationsByCandidateServiceError,
} from '../services/getApplicationsByCandidateService';

const getApplicationsByCandidateService =
  new GetApplicationsByCandidateService();

export const getApplicationsByCandidate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado para consultar las postulaciones.',
    );
  }

  const payload = request.data as Partial<GetApplicationsByCandidatePayload>;

  if (!payload.candidateId || payload.candidateId.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'El identificador del candidato (candidateId) es obligatorio.',
    );
  }

  try {
    return await getApplicationsByCandidateService.getApplicationsByCandidate(
      payload.candidateId.trim(),
      payload.jobId?.trim(),
    );
  } catch (error) {
    if (error instanceof HttpsError) throw error;

    if (error instanceof GetApplicationsByCandidateServiceError) {
      logger.error('Error obteniendo postulaciones por candidato', error);
    } else {
      logger.error('Error inesperado en getApplicationsByCandidate', error);
    }

    throw new HttpsError(
      'internal',
      'No se pudieron obtener las postulaciones del candidato.',
    );
  }
});
