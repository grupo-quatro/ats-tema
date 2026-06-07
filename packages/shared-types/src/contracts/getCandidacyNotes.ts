import type { CandidacyNote } from '../models/candidacyNote';

export interface GetCandidacyNotesPayload {
  applicationId: string;
}

export interface CandidacyNoteDTO extends Omit<
  CandidacyNote,
  'createdAt' | 'updatedAt'
> {
  createdAt: string;
  updatedAt: string;
}

export type GetCandidacyNotesResponse = CandidacyNoteDTO[];
