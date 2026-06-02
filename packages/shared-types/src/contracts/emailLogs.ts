import type { EmailLog } from '../models/emailLog';

export interface GetEmailLogsResponse {
  logs: EmailLog[];
}

export interface RetryEmailSendPayload {
  logId: string;
}

export interface RetryEmailSendResponse {
  ok: boolean;
}
