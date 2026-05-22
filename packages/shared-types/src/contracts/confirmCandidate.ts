import { CandidatePostulationBase } from './candidatePostulationBase';

export interface ConfirmCandidateProfileResponse {
  candidateId: string;
  applicationId?: string;

  profileStatus: 'completed';
  applicationStatus?: 'active';
  applicationStage?: 'applied';

  cvParseStatus?: 'not_required' | 'pending' | 'processing' | 'done' | 'failed';
}

export interface ConfirmCandidateProfilePayload {
  candidateId: string;
  applicationId?: string;
  profile: CandidatePostulationBase;
}
