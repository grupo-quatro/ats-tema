import type { ApplicationStage } from './application';

export type EmailLogStatus = 'sent' | 'failed' | 'pending';

export interface EmailLog {
  id: string;
  offerId?: string;
  applicationId: string;
  candidateId: string;
  candidateEmail: string;
  jobId: string;
  templateId: string;
  templateName: string;
  stage: ApplicationStage;
  subject: string;
  body: string;
  status: EmailLogStatus;
  error?: string;
  recruiterId: string;
  recruiterEmail: string;
  attemptedAt: Date;
  sentAt?: Date;
}

export type CreateEmailLogDTO = Omit<EmailLog, 'id' | 'sentAt'>;
export type UpdateEmailLogDTO = Pick<EmailLog, 'status'> & {
  error?: string;
  sentAt?: Date;
};
