import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import type { GetApplicationDetailPayload } from '@ats/shared-types';

import {
  ApplicationDetailNotFoundError,
  GetApplicationDetailService,
} from '../services/getApplicationDetailService';

const getApplicationDetailService = new GetApplicationDetailService();

export const getApplicationDetail = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado para consultar el detalle de una postulación.',
    );
  }

  const payload = request.data as Partial<GetApplicationDetailPayload>;

  if (!payload.applicationId || payload.applicationId.trim().length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'El identificador de la postulación (applicationId) es obligatorio.',
    );
  }

  try {
    return await getApplicationDetailService.getApplicationDetail(
      payload.applicationId.trim(),
    );
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    if (error instanceof ApplicationDetailNotFoundError) {
      throw new HttpsError('not-found', error.message);
    }

    logger.error('Error inesperado obteniendo detalle de postulación', error);

    throw new HttpsError(
      'internal',
      'No se pudo obtener el detalle de la postulación.',
    );
  }
});
