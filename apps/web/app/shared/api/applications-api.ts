import type {
  ApplicationDetailDTO,
  GetApplicationDetailPayload,
  GetApplicationsByCandidatePayload,
  GetApplicationsByCandidateResponse,
  GetApplicationsByJobPayload,
  GetApplicationsByJobResponse,
  GetCvSignedUrlPayload,
  GetCvSignedUrlResponse,
  GetStageHistoryResponse,
  UpdateApplicationStagePayload,
  UpdateApplicationStageResponse,
} from '@ats/shared-types';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref } from 'firebase/storage';
import { functions, getFunctionUrl, storage } from '../lib/firebase';
import { getToken } from '../lib/auth';

export async function getApplicationsByJob(
  payload: GetApplicationsByJobPayload,
): Promise<GetApplicationsByJobResponse> {
  const token = await getToken();
  const params = new URLSearchParams({ jobId: payload.jobId });
  if (payload.orderBy) params.set('orderBy', payload.orderBy);
  if (payload.orderDirection)
    params.set('orderDirection', payload.orderDirection);
  if (payload.limit) params.set('limit', String(payload.limit));

  const res = await fetch(
    `${getFunctionUrl('getApplicationsByJob')}?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al obtener las postulaciones');
  }
  return res.json();
}

export async function updateApplicationStage(
  payload: UpdateApplicationStagePayload,
): Promise<UpdateApplicationStageResponse> {
  const token = await getToken();
  const res = await fetch(getFunctionUrl('updateApplicationStage'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al actualizar la postulación');
  }
  return res.json();
}

export async function getApplicationDetail(
  applicationId: string,
): Promise<ApplicationDetailDTO> {
  const fn = httpsCallable<GetApplicationDetailPayload, ApplicationDetailDTO>(
    functions,
    'getApplicationDetail',
  );
  const result = await fn({ applicationId });
  return result.data;
}

export async function getApplicationsByCandidate(
  payload: GetApplicationsByCandidatePayload,
): Promise<GetApplicationsByCandidateResponse> {
  const fn = httpsCallable<
    GetApplicationsByCandidatePayload,
    GetApplicationsByCandidateResponse
  >(functions, 'getApplicationsByCandidate');
  const result = await fn(payload);
  return result.data;
}

export async function getCvDownloadUrl(applicationId: string): Promise<string> {
  const fn = httpsCallable<GetCvSignedUrlPayload, GetCvSignedUrlResponse>(
    functions,
    'getCvSignedUrl',
  );
  const result = await fn({ applicationId });
  return getDownloadURL(ref(storage, result.data.cvStoragePath));
}
export async function getStageHistory(
  applicationId: string,
): Promise<GetStageHistoryResponse> {
  const token = await getToken();
  const params = new URLSearchParams({ applicationId });
  const res = await fetch(`${getFunctionUrl('getStageHistory')}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al obtener el historial de etapa');
  }
  return res.json();
}
