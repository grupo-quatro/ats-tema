'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  ListPositionsFilters,
  ListPositionsOrderBy,
  ListPositionsOrderDir,
  ListPositionsResponse,
} from '@ats/shared-types';

import { listPositions } from '@/shared/api/positions-api';

export type { ListPositionsOrderBy, ListPositionsOrderDir };

export function usePositions(filters: ListPositionsFilters) {
  return useQuery<ListPositionsResponse>({
    queryKey: ['positions', filters],
    queryFn: () => listPositions(filters),
  });
}
