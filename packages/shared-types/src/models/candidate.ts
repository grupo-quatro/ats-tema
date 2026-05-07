export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cvUrl: string;
  cvFileName: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateCandidateDTO = Omit<
  Candidate,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateCandidateDTO = Partial<Omit<Candidate, "id" | "createdAt">>;
