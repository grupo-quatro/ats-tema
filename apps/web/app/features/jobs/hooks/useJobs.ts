'use client';

import { useQuery } from '@tanstack/react-query';
import type { Job } from '../../../../../../packages/shared-types/src/models/job';
import { getFunctionUrl } from '@/shared/lib/firebase';

async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(getFunctionUrl('listOpenJobs'));
  if (!res.ok) throw new Error('Error al obtener las posiciones');
  return res.json();
}

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  });
}
