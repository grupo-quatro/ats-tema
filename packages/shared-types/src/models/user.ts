export interface GmailCredential {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp en ms
}
