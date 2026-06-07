'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateJobPayload } from '@ats/shared-types';

import { createPosition } from '@/shared/api/positionsApi';

export function useCreatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobData: CreateJobPayload) => createPosition(jobData),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['positions'] }),
        queryClient.invalidateQueries({ queryKey: ['departments'] }),
        queryClient.invalidateQueries({ queryKey: ['jobs'] }),
      ]);
    },
  });
}
