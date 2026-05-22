'use client';

import { useMutation } from '@tanstack/react-query';
import { CreateJobDTO } from '../../../../../../packages/shared-types/src/models/job';

function getCreateJobUrl(): string {
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = process.env.NEXT_PUBLIC_FUNCTIONS_REGION ?? 'us-central1';

  if (useEmulators) {
    return `http://127.0.0.1:5001/${projectId}/${region}/createJob`;
  }
  return `https://${region}-${projectId}.cloudfunctions.net/createJob`;
}

async function createJob(jobData: CreateJobDTO): Promise<Response> {
  const res = await fetch(getCreateJobUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Error al crear la posición');
  }

  return res.json();
}

export function useCreateJob() {
  return useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      // Could invalidate queries here if needed
      console.log('Job created successfully');
    },
    onError: (error: Error) => {
      console.error('Error creating job:', error.message);
    },
  });
}
