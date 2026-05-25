import type { GetStageHistoryResponse } from '@ats/shared-types';

import { ApplicationsRepository } from '../repositories/application-repository';
import { ApplicationNotFoundError } from './update-application-service';

export class GetStageHistoryService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository = new ApplicationsRepository(),
  ) {}

  async getHistory(applicationId: string): Promise<GetStageHistoryResponse> {
    const application =
      await this.applicationsRepository.findById(applicationId);
    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    return this.applicationsRepository.getStageHistory(applicationId);
  }
}
