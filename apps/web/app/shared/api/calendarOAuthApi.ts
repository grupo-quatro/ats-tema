import { getToken } from '../lib/auth';

export interface ExchangeCalendarCodePayload {
  code: string;
  redirectUri: string;
}

export async function exchangeCalendarCode(
  payload: ExchangeCalendarCodePayload,
): Promise<void> {
  const token = await getToken();
  const res = await fetch('/api/calendar/exchange', {
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
      error.error ?? 'No se pudo conectar la cuenta de Google Calendar.',
    );
  }
}
