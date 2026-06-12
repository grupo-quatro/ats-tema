/**
 * - crear Candidate draft;
 * - crear Application draft/profile_pending;
 * - devolver candidateId, applicationId y uploadBasePath.
 *
 * Debe utilizar CandidatesRepository, ApplicationRegistrationService
 */

import type {
  ApplicationStatus,
  Candidate,
  CandidateProfileForConfirmation,
  CreateCandidateDTO,
  CvParseStatus,
  CandidatePostulationCVPayload,
  CandidatePostulationCVResponse,
  CandidatePostulationPayload,
  CandidatePostulationResponse,
  RegistrationType,
  ConfirmCandidateProfilePayload,
  ConfirmCandidateProfileResponse,
  DiscardCandidateDraftPayload,
  DiscardCandidateDraftResponse,
  GetCandidateProfileForConfirmationPayload,
  GetCandidateProfileForConfirmationResponse,
} from '@ats/shared-types';

import { CandidatesRepository } from '../repositories/candidateRepository';
import { ApplicationRegistrationService } from './applicationRegistrationService';
import { ApplicationsRepository } from '../repositories/applicationRepository';
import { storage } from '../core/firebaseAdmin';
import { normalizeCandidateProfile } from './candidateProfileNormalizer';

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
    _authenticatedUid: string,
    payload: CandidatePostulationCVPayload,
  ): Promise<CandidatePostulationCVResponse> {
    const candidateId = this.candidatesRepository.createId();

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

export class CandidateProfileForConfirmationNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CandidateProfileForConfirmationNotFoundError';
  }
}

export class CandidateProfileForConfirmationApplicationNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CandidateProfileForConfirmationApplicationNotFoundError';
  }
}

export class CandidateProfileForConfirmationApplicationMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CandidateProfileForConfirmationApplicationMismatchError';
  }
}

export class CandidateDraftDiscardNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CandidateDraftDiscardNotAllowedError';
  }
}

export class CandidateRegistrationService {
  constructor(
    private readonly candidatesRepository: CandidatesRepository = new CandidatesRepository(),
    private readonly applicationRegistrationService: ApplicationRegistrationService = new ApplicationRegistrationService(),
    private readonly applicationRepository: ApplicationsRepository = new ApplicationsRepository(),
  ) {}

  async registerCandidate(
    _authenticatedUid: string,
    payload: CandidatePostulationPayload,
  ): Promise<CandidatePostulationResponse> {
    const candidateId = this.candidatesRepository.createId();

    try {
      const normalizedProfile = normalizeCandidateProfile(payload);
      const normalizedEmail = normalizedProfile.email ?? '';
      const existingCandidates =
        await this.candidatesRepository.findManyByEmail(normalizedEmail);

      for (const existingCandidate of existingCandidates) {
        const existingApplication =
          await this.applicationRepository.findByCandidateAndJob(
            existingCandidate.id,
            payload.jobId,
          );

        if (existingApplication) {
          throw new CandidateRegistrationConflictError(
            'Ya existe una postulación activa con el correo ingresado.',
          );
        }
      }

      const registrationType = this.resolveRegistrationType(payload.jobId);
      const cvParseStatus: CvParseStatus = 'not_required';

      const firstName = normalizedProfile.firstName ?? '';
      const lastName = normalizedProfile.lastName ?? '';
      const fullName = `${firstName} ${lastName}`;

      const candidateData: CreateCandidateDTO = {
        firstName,
        lastName,
        fullName,
        email: normalizedEmail,
        phone: normalizedProfile.phone,
        location: normalizedProfile.location,
        yearsOfExperience: normalizedProfile.yearsOfExperience,
        education: normalizedProfile.education,
        technicalSkills: normalizedProfile.technicalSkills ?? [],
        professionalSummary: normalizedProfile.professionalSummary,
        profileStatus: 'completed',
        registrationType,
        registrationSource: 'manual',
        cvParseStatus,
      };

      await this.candidatesRepository.createOrUpdateCandidate(
        candidateId,
        candidateData,
      );

      if (payload.parsedExperience?.length || payload.parsedEducation?.length) {
        await this.candidatesRepository.update(candidateId, {
          parsedCv: {
            experience: payload.parsedExperience ?? [],
            education: payload.parsedEducation ?? [],
          },
        });
      }

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

  async getCandidateProfileForConfirmation(
    payload: GetCandidateProfileForConfirmationPayload,
  ): Promise<GetCandidateProfileForConfirmationResponse> {
    const candidateId = payload.candidateId.trim();
    const applicationId = payload.applicationId.trim();

    const candidate = await this.candidatesRepository.findById(candidateId);
    if (!candidate) {
      throw new CandidateProfileForConfirmationNotFoundError(
        `El candidato con ID ${candidateId} no existe.`,
      );
    }

    const application =
      await this.applicationRepository.findById(applicationId);
    if (!application) {
      throw new CandidateProfileForConfirmationApplicationNotFoundError(
        `La postulación con ID ${applicationId} no existe.`,
      );
    }

    if (application.candidateId !== candidate.id) {
      throw new CandidateProfileForConfirmationApplicationMismatchError(
        'La postulación no corresponde al candidato informado.',
      );
    }

    return {
      candidateId: candidate.id,
      applicationId: application.id,
      cvParseStatus: candidate.cvParseStatus,
      cvParseError: candidate.cvParseError ?? null,
      profileStatus: candidate.profileStatus,
      profile: this.mapCandidateToProfileForConfirmation(candidate),
    };
  }

  private mapCandidateToProfileForConfirmation(
    candidate: Candidate,
  ): CandidateProfileForConfirmation {
    return {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      yearsOfExperience: candidate.yearsOfExperience,
      education: candidate.education,
      technicalSkills: candidate.technicalSkills,
      professionalSummary: candidate.professionalSummary,
      parsedExperience: candidate.parsedCv?.experience,
      parsedEducation: candidate.parsedCv?.education,
    };
  }

  async confirmCandidateProfile(
    payload: ConfirmCandidateProfilePayload,
  ): Promise<ConfirmCandidateProfileResponse> {
    const { candidateId, applicationId, profile } = payload;
    const normalizedProfile = normalizeCandidateProfile(profile);
    const normalizedEmail = normalizedProfile.email ?? '';
    const firstName = normalizedProfile.firstName ?? '';
    const lastName = normalizedProfile.lastName ?? '';
    const fullName = `${firstName} ${lastName}`.trim();

    const currentCandidate =
      await this.candidatesRepository.findById(candidateId);
    if (!currentCandidate) {
      throw new Error(
        `CANDIDATE_NOT_FOUND: El candidato con ID ${candidateId} no existe.`,
      );
    }

    const currentApplication = applicationId
      ? await this.applicationRepository.findById(applicationId)
      : null;

    if (applicationId && !currentApplication) {
      throw new CandidateProfileForConfirmationApplicationNotFoundError(
        `La postulación con ID ${applicationId} no existe.`,
      );
    }

    if (currentApplication && currentApplication.candidateId !== candidateId) {
      throw new CandidateProfileForConfirmationApplicationMismatchError(
        'La postulación no corresponde al candidato informado.',
      );
    }

    if (currentApplication) {
      const existingCandidates =
        await this.candidatesRepository.findManyByEmail(normalizedEmail);

      for (const existingCandidate of existingCandidates) {
        if (existingCandidate.id === candidateId) {
          continue;
        }

        const existingApplication =
          await this.applicationRepository.findByCandidateAndJob(
            existingCandidate.id,
            currentApplication.jobId,
          );

        if (existingApplication) {
          throw new CandidateRegistrationConflictError(
            'Ya existe una postulación activa con el correo ingresado.',
          );
        }
      }
    }

    await this.candidatesRepository.update(candidateId, {
      firstName,
      lastName,
      fullName,
      email: normalizedEmail,
      phone: normalizedProfile.phone,
      location: normalizedProfile.location,
      yearsOfExperience: normalizedProfile.yearsOfExperience,
      education: normalizedProfile.education,
      technicalSkills: normalizedProfile.technicalSkills,
      professionalSummary: normalizedProfile.professionalSummary,
      parsedCv: {
        experience: profile.parsedExperience ?? [],
        education: profile.parsedEducation ?? [],
      },

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
        candidateName: fullName,
        candidateEmail: normalizedEmail,
      });

      const stageHistory =
        await this.applicationRepository.getStageHistory(applicationId);
      const hasAppliedHistory = stageHistory.some(
        (entry) => entry.stage === 'applied',
      );

      if (!hasAppliedHistory) {
        await this.applicationRepository.addStageHistoryEntry(applicationId, {
          stage: 'applied',
          changedBy: candidateId,
          changedByEmail: normalizedEmail,
          notes: 'Perfil confirmado por el candidato.',
        });
      }
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

  async discardCandidateDraft(
    payload: DiscardCandidateDraftPayload,
  ): Promise<DiscardCandidateDraftResponse> {
    const candidateId = payload.candidateId.trim();
    const applicationId = payload.applicationId.trim();

    const candidate = await this.candidatesRepository.findById(candidateId);
    if (!candidate) {
      throw new CandidateProfileForConfirmationNotFoundError(
        `El candidato con ID ${candidateId} no existe.`,
      );
    }

    const application =
      await this.applicationRepository.findById(applicationId);
    if (!application) {
      throw new CandidateProfileForConfirmationApplicationNotFoundError(
        `La postulación con ID ${applicationId} no existe.`,
      );
    }

    if (application.candidateId !== candidateId) {
      throw new CandidateProfileForConfirmationApplicationMismatchError(
        'La postulación no corresponde al candidato informado.',
      );
    }

    if (
      candidate.registrationSource !== 'cv_upload' ||
      candidate.profileStatus !== 'draft' ||
      application.status !== 'draft'
    ) {
      throw new CandidateDraftDiscardNotAllowedError(
        'Solo se pueden descartar postulaciones por CV que todavía no fueron confirmadas.',
      );
    }

    if (candidate.cvStoragePath) {
      await storage.bucket().file(candidate.cvStoragePath).delete({
        ignoreNotFound: true,
      });
    }

    await this.applicationRepository.delete(applicationId);
    await this.candidatesRepository.delete(candidateId);

    return {
      candidateId,
      applicationId,
      discarded: true,
    };
  }
}
