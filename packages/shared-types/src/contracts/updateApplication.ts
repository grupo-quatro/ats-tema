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

export interface PreviewApplicationStageEmailPayload extends UpdateApplicationStagePayload {}

export interface PreviewApplicationStageEmailResponse {
  stage: ApplicationStage;
  candidateEmail: string;
  hasEmail: boolean;
  templateName?: string;
  subject?: string;
  body?: string;
}
