import type { ApplicationStage } from '../models';

export interface UpdateApplicationStagePayload {
  applicationId: string;
  stage: ApplicationStage;
  rejectionReason?: string;
  notes?: string;
}

export interface UpdateApplicationStageResponse {
  ok: boolean;
}
