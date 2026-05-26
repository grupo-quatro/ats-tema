import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import {
  CandidatePostulationCVPayload,
  CandidatePostulationPayload,
  ConfirmCandidateProfilePayload,
} from '@ats/shared-types';

import { CandidateRegistrationCVService } from '../services/candidateService';
import {
  CandidateRegistrationConflictError,
  CandidateRegistrationService,
} from '../services/candidateService';
import {
  validateRegisterCandidatePayload,
  validateStartApplicationWithCVPayload,
} from '../validators/candidateValidator';
import { HttpAuthError, requireAuthenticatedUser } from '../core/http-auth';

const candidateRegistrationCVService = new CandidateRegistrationCVService();
const candidateRegistrationService = new CandidateRegistrationService();

export const registerCandidateCV = onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const candidateId = await requireAuthenticatedUser(req);

    const payload = req.body as Partial<CandidatePostulationCVPayload>;
    validateStartApplicationWithCVPayload(payload);

    const result = await candidateRegistrationCVService.registerCandidateCV(
      candidateId,
      payload,
    );
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      res.status(401).json({ error: error.message });
      return;
    }

    logger.error('Error inesperado iniciando postulación por CV', error);
    res
      .status(500)
      .json({ error: 'No se pudo iniciar la postulación por CV.' });
  }
});

export const registerCandidate = onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    const candidateId = await requireAuthenticatedUser(req);

    const payload = req.body as Partial<CandidatePostulationPayload>;
    validateRegisterCandidatePayload(payload);

    const result = await candidateRegistrationService.registerCandidate(
      candidateId,
      payload,
    );
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      res.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof CandidateRegistrationConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }

    logger.error('Error inesperado registrando candidato', error);
    res.status(500).json({ error: 'No se pudo registrar el candidato.' });
  }
});

export const confirmCandidateProfile = onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    await requireAuthenticatedUser(req);

    const data = req.body as Partial<ConfirmCandidateProfilePayload>;

    if (!data.candidateId || !data.profile) {
      res.status(400).json({
        error:
          'Faltan argumentos mandatorios: candidateId y profile son requeridos.',
      });
      return;
    }

    logger.info('Iniciando confirmación de perfil de candidato', {
      candidateId: data.candidateId,
      applicationId: data.applicationId,
    });

    const result = await candidateRegistrationService.confirmCandidateProfile(
      data as ConfirmCandidateProfilePayload,
    );

    logger.info('Perfil de candidato confirmado con éxito', {
      candidateId: result.candidateId,
      applicationId: result.applicationId,
    });

    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof HttpAuthError) {
      res.status(401).json({ error: error.message });
      return;
    }

    logger.error('Error fatal al confirmar el perfil del candidato', {
      error: error.message,
      payload: req.body,
    });

    if (error.message?.includes('CANDIDATE_NOT_FOUND')) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({
      error:
        'Ocurrió un error interno en el servidor al procesar la confirmación.',
    });
  }
});
