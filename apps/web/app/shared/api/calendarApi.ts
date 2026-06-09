import { getToken } from '../lib/auth';

export async function updateCalendarLink(calendarLink: string): Promise<void> {
  const token = await getToken();
  const response = await fetch('/api/calendar/update-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ calendarLink }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      body.error ?? 'No se pudo actualizar el link de calendario.',
    );
  }
}
