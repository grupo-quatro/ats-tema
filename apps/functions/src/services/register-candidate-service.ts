import type {
  CreateCandidateDTO,
  CvParseStatus,
  RegistrationType,
  RegisterCandidatePayload,
  RegisterCandidateResponse,
} from "@ats/shared-types";

import { CandidatesRepository } from "../repositories/candidate-repository";

export class CandidateRegistrationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidateRegistrationConflictError";
  }
}

export class CandidateRegistrationServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CandidateRegistrationServiceError";
  }
}

export class CandidateRegistrationService {
  constructor(
    private readonly candidatesRepository: CandidatesRepository = new CandidatesRepository(),
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
          "Ya existe un candidato con ese email asociado a otro identificador.",
        );
      }

      const registrationType = this.resolveRegistrationType(payload.jobId);
      const cvParseStatus = this.resolveCvParseStatus(payload.hasCv);

      const candidateData: CreateCandidateDTO = {
        fullName: payload.fullName,
        email: payload.email,
        registrationType,
        cvParseStatus,
      };

      await this.candidatesRepository.createOrUpdateCandidate(
        candidateId,
        candidateData,
      );

      return {
        candidateId,
        cvParseStatus,
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

  private resolveRegistrationType(jobId?: string): RegistrationType {
    return jobId ? "specific" : "general";
  }

  private resolveCvParseStatus(hasCv: boolean): CvParseStatus {
    return hasCv ? "pending" : "not_required";
  }
}
