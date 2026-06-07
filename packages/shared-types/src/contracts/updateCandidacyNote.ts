import type { CandidacyNoteDTO } from './getCandidacyNotes';

export interface UpdateCandidacyNotePayload {
  applicationId: string;
  id: string;
  text: string;
}

export type UpdateCandidacyNoteResponse = CandidacyNoteDTO;
