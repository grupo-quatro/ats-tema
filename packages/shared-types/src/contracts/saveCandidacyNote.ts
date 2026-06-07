export interface SaveCandidacyNotePayload {
  applicationId: string;
  text: string;
}

export interface SaveCandidacyNoteResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
}
