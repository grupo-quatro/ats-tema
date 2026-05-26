import type {
  CreateJobDTO,
  ListPositionsFilters,
  ListPositionsResponse,
  UpdatePositionStatusPayload,
} from '@ats/shared-types';

import { getFunctionUrl } from '../lib/firebase';
import { getToken } from '../lib/auth';

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

export async function createPosition(jobData: CreateJobDTO): Promise<unknown> {
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
    const error = await res.json();
    throw new Error(error.message || 'Error al crear la posición');
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
    const error = await res.json();
    throw new Error(error.message || 'Error al actualizar el estado');
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
