export type CandidacyNoteSource = 'manual' | 'interview';

export interface CandidacyNote {
  id: string;
  applicationId: string;
  text: string;
  source: CandidacyNoteSource;
  authorUid: string;
  authorName: string;
  authorRole: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateCandidacyNoteDTO = Omit<
  CandidacyNote,
  'id' | 'createdAt' | 'updatedAt' | 'authorUid' | 'authorName' | 'authorRole'
>;

export type UpdateCandidacyNoteDTO = Pick<CandidacyNote, 'text'>;
