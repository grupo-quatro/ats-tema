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
