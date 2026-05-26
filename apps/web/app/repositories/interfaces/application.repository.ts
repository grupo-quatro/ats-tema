import type {
  GetApplicationsByJobPayload,
  GetApplicationsByJobResponse,
  UpdateApplicationStagePayload,
  UpdateApplicationStageResponse,
} from '@ats/shared-types';

export interface IApplicationRepository {
  getApplicationsByJob(
    payload: GetApplicationsByJobPayload,
  ): Promise<GetApplicationsByJobResponse>;
  updateApplicationStage(
    payload: UpdateApplicationStagePayload,
  ): Promise<UpdateApplicationStageResponse>;
}
