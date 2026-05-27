'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { JobStatus, UpdatePositionStatusPayload } from '@ats/shared-types';

import { updatePositionStatus } from '@/shared/api/positionsApi';

export function useUpdatePositionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePositionStatusPayload) =>
      updatePositionStatus(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

export type { JobStatus };
