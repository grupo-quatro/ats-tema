import { getAuth } from 'firebase/auth';

import type {
  GetApplicationsByJobPayload,
  GetApplicationsByJobResponse,
  UpdateApplicationStagePayload,
  UpdateApplicationStageResponse,
} from '@ats/shared-types';

import { getFunctionUrl } from '../../shared/lib/firebase';
import type { IApplicationRepository } from '../interfaces/application.repository';

async function getToken(): Promise<string> {
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
  if (useEmulators) return 'dev-recruiter';
  return (await getAuth().currentUser?.getIdToken()) ?? '';
}

export class ApplicationFirebaseRepository implements IApplicationRepository {
  async getApplicationsByJob(
    payload: GetApplicationsByJobPayload,
  ): Promise<GetApplicationsByJobResponse> {
    const token = await getToken();
    const params = new URLSearchParams();
    params.set('jobId', payload.jobId);
    if (payload.orderBy) params.set('orderBy', payload.orderBy);
    if (payload.orderDirection)
      params.set('orderDirection', payload.orderDirection);
    if (payload.limit !== undefined) params.set('limit', String(payload.limit));

    const res = await fetch(
      `${getFunctionUrl('getApplicationsByJob')}?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error('Error al obtener las postulaciones');
    return res.json();
  }

  async updateApplicationStage(
    payload: UpdateApplicationStagePayload,
  ): Promise<UpdateApplicationStageResponse> {
    const token = await getToken();
    const res = await fetch(getFunctionUrl('updateApplicationStage'), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error al actualizar la postulación');
    return res.json();
  }
}
