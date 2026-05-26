'use client';

import { useQuery } from '@tanstack/react-query';

import { listDepartments } from '@/shared/api/positions-api';

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: listDepartments,
    staleTime: 5 * 60 * 1000,
  });
}
