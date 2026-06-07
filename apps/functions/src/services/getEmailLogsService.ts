import type { EmailLog } from '@ats/shared-types';

import type { IEmailLogRepository } from '../repositories/emailLogRepository';
import { EmailLogRepository } from '../repositories/emailLogRepository';

export class GetEmailLogsService {
  constructor(
    private readonly emailLogRepository: IEmailLogRepository = new EmailLogRepository(),
  ) {}

  async getByCandidate(candidateId: string): Promise<EmailLog[]> {
    return this.emailLogRepository.findByCandidate(candidateId);
  }

  async getFailedByApplication(applicationId: string): Promise<EmailLog[]> {
    return this.emailLogRepository.findFailedByApplication(applicationId);
  }
}
