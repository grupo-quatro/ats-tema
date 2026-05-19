'use client';

import { useQuery } from '@tanstack/react-query';
import type { Job } from '../../../../../../packages/shared-types/src/models/job';

function getJobsUrl(): string {
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = process.env.NEXT_PUBLIC_FUNCTIONS_REGION ?? 'us-central1';

  if (useEmulators) {
    return `http://127.0.0.1:5001/${projectId}/${region}/listOpenJobs`;
  }
  return `https://${region}-${projectId}.cloudfunctions.net/listOpenJobs`;
}

async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(getJobsUrl());
  if (!res.ok) throw new Error('Error al obtener las posiciones');
  return res.json();
}

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  });
}
