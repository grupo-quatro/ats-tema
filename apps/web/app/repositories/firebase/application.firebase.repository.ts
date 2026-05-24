import type {
  GetApplicationsByJobPayload,
  GetApplicationsByJobResponse,
  UpdateApplicationStagePayload,
  UpdateApplicationStageResponse,
} from '@ats/shared-types';

import { callFunction } from '../../shared/lib/firebase';
import type { IApplicationRepository } from '../interfaces/application.repository';

export class ApplicationFirebaseRepository implements IApplicationRepository {
  async getApplicationsByJob(
    payload: GetApplicationsByJobPayload,
  ): Promise<GetApplicationsByJobResponse> {
    const result = await callFunction<
      GetApplicationsByJobPayload,
      GetApplicationsByJobResponse
    >('getApplicationsByJob', payload);
    return result.data;
  }

  async updateApplicationStage(
    payload: UpdateApplicationStagePayload,
  ): Promise<UpdateApplicationStageResponse> {
    const result = await callFunction<
      UpdateApplicationStagePayload,
      UpdateApplicationStageResponse
    >('updateApplicationStage', payload);
    return result.data;
  }
}
