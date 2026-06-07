import { getFunctionUrl } from '../lib/functionsUrl';
import { getToken } from '../lib/auth';

export interface ExchangeGmailCodePayload {
  code: string;
  redirectUri: string;
}

export async function exchangeGmailCode(
  payload: ExchangeGmailCodePayload,
): Promise<void> {
  const token = await getToken();
  const res = await fetch(getFunctionUrl('exchangeGmailCode'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = (await res.json()) as { error?: string };
    throw new Error(error.error ?? 'No se pudo conectar la cuenta de Gmail.');
  }
}
