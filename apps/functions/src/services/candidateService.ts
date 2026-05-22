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
  CandidatePostulationCVPayload,
  CandidatePostulationCVResponse,
  CandidatePostulationPayload,
  CandidatePostulationResponse,
  RegistrationType,
  ConfirmCandidateProfilePayload,
  ConfirmCandidateProfileResponse,
} from '@ats/shared-types';

import { CandidatesRepository } from '../repositories/candidateRepository';
import { ApplicationRegistrationService } from './application-registration-service';
import { ApplicationsRepository } from '../repositories/application-repository';

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
    payload: CandidatePostulationCVPayload,
  ): Promise<CandidatePostulationCVResponse> {
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
    private readonly applicationRepository: ApplicationsRepository = new ApplicationsRepository(),
  ) {}

  async registerCandidate(
    candidateId: string,
    payload: CandidatePostulationPayload,
  ): Promise<CandidatePostulationResponse> {
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

  async confirmCandidateProfile(
    payload: ConfirmCandidateProfilePayload,
  ): Promise<ConfirmCandidateProfileResponse> {
    const { candidateId, applicationId, profile } = payload;

    const currentCandidate =
      await this.candidatesRepository.findById(candidateId);
    if (!currentCandidate) {
      throw new Error(
        `CANDIDATE_NOT_FOUND: El candidato con ID ${candidateId} no existe.`,
      );
    }

    await this.candidatesRepository.update(candidateId, {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      yearsOfExperience: profile.yearsOfExperience,
      education: profile.education,
      technicalSkills: profile.technicalSkills,
      professionalSummary: profile.professionalSummary,

      profileStatus: 'completed',
      cvParseStatus:
        currentCandidate.cvParseStatus === 'not_required'
          ? 'not_required'
          : 'done',
    });

    if (applicationId) {
      await this.applicationRepository.update(applicationId, {
        stage: 'applied',
        status: 'active',
        candidateName: `${profile.firstName} ${profile.lastName}`.trim(),
        candidateEmail: profile.email,
      });
    }

    return {
      candidateId,
      applicationId,
      profileStatus: 'completed',
      applicationStatus: applicationId ? 'active' : undefined,
      applicationStage: applicationId ? 'applied' : undefined,
      cvParseStatus: (currentCandidate as any).cvParseStatus || 'not_required',
    };
  }
}
