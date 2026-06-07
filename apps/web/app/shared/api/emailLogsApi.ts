import type {
  GetEmailLogsResponse,
  RetryEmailSendResponse,
} from '@ats/shared-types';
import { getFunctionUrl } from '../lib/firebase';
import { getToken } from '../lib/auth';

export async function getEmailLogs(
  candidateId: string,
): Promise<GetEmailLogsResponse> {
  const token = await getToken();
  const params = new URLSearchParams({ candidateId });
  const res = await fetch(`${getFunctionUrl('getEmailLogs')}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || 'Error al obtener el historial de comunicaciones',
    );
  }
  return res.json();
}

export async function getFailedEmailLogs(
  applicationId: string,
): Promise<GetEmailLogsResponse> {
  const token = await getToken();
  const params = new URLSearchParams({ applicationId });
  const res = await fetch(`${getFunctionUrl('getEmailLogs')}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || 'Error al obtener las comunicaciones fallidas',
    );
  }
  return res.json();
}

export async function retryEmailSend(
  logId: string,
): Promise<RetryEmailSendResponse> {
  const token = await getToken();
  const res = await fetch(getFunctionUrl('retryEmailSend'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ logId }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al reenviar el email');
  }
  return res.json();
}
