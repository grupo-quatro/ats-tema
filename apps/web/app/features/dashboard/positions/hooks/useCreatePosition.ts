'use client';

import { useMutation } from '@tanstack/react-query';
import { CreateJobDTO } from '@ats/shared-types';

function getCreatePositionUrl(): string {
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = process.env.NEXT_PUBLIC_FUNCTIONS_REGION ?? 'us-central1';

  if (useEmulators) {
    return `http://127.0.0.1:5001/${projectId}/${region}/createJob`;
  }
  return `https://${region}-${projectId}.cloudfunctions.net/createJob`;
}

async function createPosition(jobData: CreateJobDTO): Promise<Response> {
  const res = await fetch(getCreatePositionUrl(), {
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

export function useCreatePosition() {
  return useMutation({
    mutationFn: createPosition,
    onSuccess: () => {
      console.log('Position created successfully');
    },
    onError: (error: Error) => {
      console.error('Error creating position:', error.message);
    },
  });
}
