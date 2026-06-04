import type {
  GetStageHistoryResponse,
  StageHistoryEntry,
} from '@ats/shared-types';

import { ApplicationsRepository } from '../repositories/applicationRepository';
import { ApplicationNotFoundError } from './updateApplicationService';

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

    const history =
      await this.applicationsRepository.getStageHistory(applicationId);
    const visibleHistory = history.filter(
      (entry) => entry.stage !== 'profile_pending',
    );

    if (
      application.status === 'active' &&
      application.stage === 'applied' &&
      !visibleHistory.some((entry) => entry.stage === 'applied')
    ) {
      const appliedEntry: StageHistoryEntry = {
        id: `${applicationId}-applied`,
        stage: 'applied',
        changedAt: application.stageUpdatedAt,
        changedBy: application.candidateId,
        changedByEmail: application.candidateEmail ?? application.candidateId,
      };

      return [appliedEntry, ...visibleHistory].sort(
        (left, right) => right.changedAt.getTime() - left.changedAt.getTime(),
      );
    }

    return visibleHistory;
  }
}
