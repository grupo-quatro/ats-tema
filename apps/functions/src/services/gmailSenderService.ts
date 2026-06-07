import { logger } from 'firebase-functions';

export interface SendEmailPayload {
  accessToken: string;
  to: string;
  subject: string;
  htmlBody: string;
}

export class GmailSendError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'GmailSendError';
  }
}

export class GmailSenderService {
  async send(payload: SendEmailPayload): Promise<void> {
    if (process.env.GMAIL_MOCK === 'true') {
      logger.info(
        `GMAIL_MOCK: would send to ${payload.to} subject ${payload.subject}`,
      );
      return;
    }

    const mimeString = [
      'From: me',
      `To: ${payload.to}`,
      `Subject: ${payload.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      payload.htmlBody,
    ].join('\r\n');

    const base64urlMessage = Buffer.from(mimeString)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${payload.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: base64urlMessage }),
      },
    );

    if (!response.ok) {
      throw new GmailSendError(
        `Gmail API error: ${response.status} ${response.statusText}`,
        response.status,
      );
    }
  }
}
