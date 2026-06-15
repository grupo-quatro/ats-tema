import { defineSecret } from 'firebase-functions/params';

export const oauthEncryptionKey = defineSecret('OAUTH_ENCRYPTION_KEY');
export const calendarWebhookSecret = defineSecret('CALENDAR_WEBHOOK_SECRET');
