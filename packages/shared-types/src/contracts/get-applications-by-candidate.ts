import type { ApplicationWithCandidateDTO } from './get-applications-by-job';

export interface GetApplicationsByCandidatePayload {
  candidateId: string;
  /** Opcional: si se provee, filtra y devuelve solo la postulación de ese job. */
  jobId?: string;
}

export type GetApplicationsByCandidateResponse = ApplicationWithCandidateDTO[];
