import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ApplicationsRepository } from '../repositories/application-repository';
import { CandidatesRepository } from '../repositories/candidateRepository';
import type {
  GetCvSignedUrlPayload,
  GetCvSignedUrlResponse,
} from '@ats/shared-types';

const applicationsRepository = new ApplicationsRepository();
const candidatesRepository = new CandidatesRepository();

export const getCvSignedUrl = onCall(
  async (request): Promise<GetCvSignedUrlResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    }

    const payload = request.data as Partial<GetCvSignedUrlPayload>;

    if (!payload.applicationId?.trim()) {
      throw new HttpsError('invalid-argument', 'applicationId es obligatorio.');
    }

    const application = await applicationsRepository.findById(
      payload.applicationId.trim(),
    );
    if (!application) {
      throw new HttpsError('not-found', 'Postulación no encontrada.');
    }

    const candidate = await candidatesRepository.findById(
      application.candidateId,
    );
    if (!candidate?.cvStoragePath) {
      throw new HttpsError('not-found', 'Este candidato no tiene CV cargado.');
    }

    return { cvStoragePath: candidate.cvStoragePath };
  },
);
