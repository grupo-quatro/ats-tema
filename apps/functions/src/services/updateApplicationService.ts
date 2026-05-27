import type {
  ApplicationStage,
  ApplicationStatus,
  UpdateApplicationStagePayload,
  UpdateApplicationStageResponse,
} from '@ats/shared-types';

import { auth } from '../core/firebaseAdmin';
import { ApplicationsRepository } from '../repositories/applicationRepository';

export class ApplicationNotFoundError extends Error {
  constructor(applicationId: string) {
    super(`La postulación ${applicationId} no existe.`);
    this.name = 'ApplicationNotFoundError';
  }
}

export class UpdateApplicationStageService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository = new ApplicationsRepository(),
  ) {}

  async updateStage(
    payload: UpdateApplicationStagePayload,
    changedBy: string,
  ): Promise<UpdateApplicationStageResponse> {
    const { applicationId, stage, rejectionReason, notes } = payload;

    const application =
      await this.applicationsRepository.findById(applicationId);
    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    const status = this.resolveStatus(stage);

    const [, userRecord] = await Promise.all([
      this.applicationsRepository.update(applicationId, {
        stage,
        status,
        ...(rejectionReason !== undefined && { rejectionReason }),
        ...(notes !== undefined && { notes }),
      }),
      auth.getUser(changedBy).catch(() => null),
    ]);

    await this.applicationsRepository.addStageHistoryEntry(applicationId, {
      stage,
      changedBy,
      changedByEmail: userRecord?.email ?? changedBy,
      ...(rejectionReason !== undefined && { rejectionReason }),
      ...(notes !== undefined && { notes }),
    });

    return { ok: true };
  }

  private resolveStatus(
    stage: ApplicationStage,
  ): ApplicationStatus | undefined {
    if (stage === 'hired') return 'hired';
    if (stage === 'rejected') return 'rejected';
    if (stage === 'withdrawn') return 'withdrawn';
    return 'active';
  }
}
