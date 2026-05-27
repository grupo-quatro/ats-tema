import type { StageHistoryEntry } from '../models';

export interface GetStageHistoryPayload {
  applicationId: string;
}

export type GetStageHistoryResponse = StageHistoryEntry[];
