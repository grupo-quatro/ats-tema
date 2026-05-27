'use client';

import { useQuery } from '@tanstack/react-query';

import { listOpenJobs } from '@/shared/api/jobsApi';

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: listOpenJobs,
  });
}
