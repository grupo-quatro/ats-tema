export interface GmailCredential {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp en ms
}

export interface User {
  uid: string;
  gmailCredential?: GmailCredential;
  calendarCredential?: GmailCredential;
}

export interface CalendarWatch {
  channelId: string; // ID del canal registrado en Google Calendar API
  resourceId: string; // ID del recurso devuelto por Google al registrar el canal
  expiresAt: number; // Unix timestamp en ms — los canales expiran en 30 días
}
