'use client';

import { useQuery } from '@tanstack/react-query';
import { getFunctionUrl } from '@/shared/lib/firebase';

async function fetchDepartments(): Promise<string[]> {
  const res = await fetch(getFunctionUrl('listDepartments'), {
    headers: { Authorization: 'Bearer dev-recruiter' },
  });
  if (!res.ok) throw new Error('Error al obtener los departamentos');
  return res.json();
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    staleTime: 5 * 60 * 1000,
  });
}
