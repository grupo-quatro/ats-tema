export interface CandidatePostulationBase {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  location?: string;
  desiredPosition?: string;
  yearsOfExperience?: number;
  education?: string;
  technicalSkills?: string[];
  professionalSummary?: string;
}
