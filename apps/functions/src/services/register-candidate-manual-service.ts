import type {
  ApplicationStatus,
  CreateCandidateDTO,
  CvParseStatus,
  RegistrationType,
  RegisterCandidatePayload,
  RegisterCandidateResponse,
} from '@ats/shared-types';

import { CandidatesRepository } from '../repositories/candidate-repository';
import { ApplicationRegistrationService } from './application-registration-service';

export class CandidateRegistrationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CandidateRegistrationConflictError';
  }
}

export class CandidateRegistrationServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CandidateRegistrationServiceError';
  }
}

export class CandidateRegistrationService {
  constructor(
    private readonly candidatesRepository: CandidatesRepository = new CandidatesRepository(),
    private readonly applicationRegistrationService: ApplicationRegistrationService = new ApplicationRegistrationService(),
  ) {}

  async registerCandidate(
    candidateId: string,
    payload: RegisterCandidatePayload,
  ): Promise<RegisterCandidateResponse> {
    try {
      const existingCandidate = await this.candidatesRepository.findByEmail(
        payload.email,
      );

      if (existingCandidate && existingCandidate.id !== candidateId) {
        throw new CandidateRegistrationConflictError(
          'Ya existe un candidato con ese email asociado a otro identificador.',
        );
      }

      const registrationType = this.resolveRegistrationType(payload.jobId);
      const cvParseStatus: CvParseStatus = 'not_required';

      const firstName = payload.firstName.trim();
      const lastName = payload.lastName.trim();
      const fullName = `${firstName} ${lastName}`;

      const candidateData: CreateCandidateDTO = {
        firstName,
        lastName,
        fullName,
        email: payload.email.trim(),
        phone: payload.phone.trim(),
        location: payload.location?.trim(),
        yearsOfExperience: payload.yearsOfExperience,
        education: payload.education?.trim(),
        technicalSkills: payload.technicalSkills ?? [],
        professionalSummary: payload.professionalSummary?.trim(),
        profileStatus: 'completed',
        registrationType,
        registrationSource: 'manual',
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
          'manual',
        );

      const applicationStatus: ApplicationStatus = 'active';

      return {
        candidateId,
        applicationId,
        cvParseStatus,
        applicationStatus,
      };
    } catch (error) {
      if (error instanceof CandidateRegistrationConflictError) {
        throw error;
      }

      throw new CandidateRegistrationServiceError(
        `No se pudo registrar el candidato ${candidateId}.`,
        error,
      );
    }
  }

  private resolveRegistrationType(jobId: string): RegistrationType {
    return jobId ? 'specific' : 'general';
  }
}
