/**
 * - crear Candidate draft;
 * - crear Application draft/profile_pending;
 * - devolver candidateId, applicationId y uploadBasePath.
 *
 * Debe utilizar CandidatesRepository, ApplicationRegistrationService
 */

import type {
  ApplicationStatus,
  CreateCandidateDTO,
  CvParseStatus,
  RegisterCandidateCVPayload,
  RegisterCandidateCVResponse,
} from '@ats/shared-types';

import { CandidatesRepository } from '../repositories/candidate-repository';
import { ApplicationRegistrationService } from './application-registration-service';

export class CandidateRegistrationCVServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CandidateRegistrationCVServiceError';
  }
}

export class CandidateRegistrationCVService {
  constructor(
    private readonly candidatesRepository: CandidatesRepository = new CandidatesRepository(),
    private readonly applicationRegistrationService: ApplicationRegistrationService = new ApplicationRegistrationService(),
  ) {}

  async registerCandidateCV(
    candidateId: string,
    payload: RegisterCandidateCVPayload,
  ): Promise<RegisterCandidateCVResponse> {
    try {
      const cvParseStatus: CvParseStatus = 'pending';

      const candidateData: CreateCandidateDTO = {
        profileStatus: 'draft',
        registrationType: 'specific',
        registrationSource: 'cv_upload',
        cvParseStatus,
      };

      await this.candidatesRepository.createOrUpdateCandidate(
        candidateId,
        candidateData,
      );

      const applicationId =
        await this.applicationRegistrationService.createApplicationForCandidate(
          candidateId,
          payload.jobId,
          'cv_upload',
        );

      const applicationStatus: ApplicationStatus = 'draft';

      return {
        candidateId,
        applicationId,
        uploadBasePath: `cvs/${candidateId}/`,
        cvParseStatus,
        applicationStatus,
      };
    } catch (error) {
      throw new CandidateRegistrationCVServiceError(
        `No se pudo iniciar la postulación por CV para el candidato ${candidateId}.`,
        error,
      );
    }
  }
}
