'use client';

import { useQuery } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import { getFunctionUrl } from '@/shared/lib/firebase';
import type {
  ListPositionsFilters,
  ListPositionsOrderBy,
  ListPositionsOrderDir,
  ListPositionsResponse,
} from '@ats/shared-types';

export type { ListPositionsOrderBy, ListPositionsOrderDir };

async function fetchPositions(
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

  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
  const token = useEmulators
    ? 'dev-recruiter'
    : await getAuth().currentUser?.getIdToken() ?? '';

  const url = `${getFunctionUrl('listPositions')}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error al obtener las posiciones');
  return res.json();
}

export function usePositions(filters: ListPositionsFilters) {
  return useQuery({
    queryKey: ['positions', filters],
    queryFn: () => fetchPositions(filters),
  });
}
