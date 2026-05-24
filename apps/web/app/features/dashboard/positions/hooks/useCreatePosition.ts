'use client';

import { useMutation } from '@tanstack/react-query';
import { CreateJobDTO } from '@ats/shared-types';
import { getFunctionUrl } from '@/shared/lib/firebase';

async function createPosition(jobData: CreateJobDTO): Promise<Response> {
  const res = await fetch(getFunctionUrl('createJob'), {
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
