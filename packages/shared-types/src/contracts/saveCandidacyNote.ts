import type { CandidacyNoteSource } from '../models/candidacyNote';

export interface SaveCandidacyNotePayload {
  applicationId: string;
  text: string;
  source?: CandidacyNoteSource;
}

export interface SaveCandidacyNoteResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
}
