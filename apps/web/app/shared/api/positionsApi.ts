import type {
  CreateJobPayload,
  ListPositionsFilters,
  ListPositionsResponse,
  UpdatePositionPayload,
  UpdatePositionStatusPayload,
} from '@ats/shared-types';

import { getToken } from '../lib/auth';
import { getFunctionUrl } from '../lib/firebase';

export async function listPositions(
  filters: ListPositionsFilters,
): Promise<ListPositionsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.location) params.set('location', filters.location);
  if (filters.department) params.set('department', filters.department);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.orderBy) params.set('orderBy', filters.orderBy);
  if (filters.orderDir) params.set('orderDir', filters.orderDir);

  const token = await getToken();
  const res = await fetch(`${getFunctionUrl('listPositions')}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error al obtener las posiciones');
  return res.json();
}

async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const error = await res.json();
    return error.error || error.message || fallback;
  } catch {
    return fallback;
  }
}

export async function createPosition(
  jobData: CreateJobPayload,
): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(getFunctionUrl('createJob'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(jobData),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, 'Error al crear la posicion'));
  }
  return res.json();
}

export async function updatePositionStatus(
  payload: UpdatePositionStatusPayload,
): Promise<void> {
  const token = await getToken();
  const res = await fetch(getFunctionUrl('updatePositionStatus'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, 'Error al actualizar el estado'));
  }
}

export async function updatePosition(
  payload: UpdatePositionPayload,
): Promise<void> {
  const token = await getToken();
  const res = await fetch(getFunctionUrl('updatePosition'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res, 'Error al actualizar la posicion'));
  }
}

export async function listDepartments(): Promise<string[]> {
  const token = await getToken();
  const res = await fetch(getFunctionUrl('listDepartments'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error al obtener los departamentos');
  return res.json();
}
