import type {
  GetApplicationsByJobPayload,
  GetApplicationsByJobResponse,
  UpdateApplicationStagePayload,
  UpdateApplicationStageResponse,
} from '@ats/shared-types';

import * as applicationsApi from '../../shared/api/applicationsApi';
import type { IApplicationRepository } from '../interfaces/application.repository';

export class ApplicationFirebaseRepository implements IApplicationRepository {
  async getApplicationsByJob(
    payload: GetApplicationsByJobPayload,
  ): Promise<GetApplicationsByJobResponse> {
    return applicationsApi.getApplicationsByJob(payload);
  }

  async updateApplicationStage(
    payload: UpdateApplicationStagePayload,
  ): Promise<UpdateApplicationStageResponse> {
    return applicationsApi.updateApplicationStage(payload);
  }
}
