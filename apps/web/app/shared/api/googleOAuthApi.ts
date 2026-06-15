import { getToken } from '../lib/auth';

const GOOGLE_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GMAIL_REDIRECT_URI ?? 'http://localhost:3000';
const GOOGLE_OAUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ?? '';

export const GOOGLE_REDIRECT_URI_VALUE = GOOGLE_REDIRECT_URI;

export function buildGoogleUnifiedOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(payload: {
  code: string;
  redirectUri: string;
}): Promise<void> {
  const token = await getToken();
  const res = await fetch('/api/google/exchange', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      error.error ?? 'No se pudieron conectar las cuentas de Google.',
    );
  }
}
