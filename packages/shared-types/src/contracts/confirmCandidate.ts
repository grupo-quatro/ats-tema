import { CandidatePostulationBase } from './candidatePostulationBase';

export interface ConfirmCandidateProfileResponse {
  candidateId: string;
  applicationId?: string;

  profileStatus: 'confirmed';
  applicationStatus?: 'active';
  applicationStage?: 'postulacion_recibida';

  cvParseStatus?: 'not_required' | 'pending' | 'processing' | 'done' | 'failed';
}

export interface ConfirmCandidateProfilePayload {
  candidateId: string;
  applicationId?: string;
  profile: CandidatePostulationBase;
}
