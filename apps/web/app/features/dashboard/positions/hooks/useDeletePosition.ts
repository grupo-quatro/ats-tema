'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DeletePositionPayload } from '@ats/shared-types';

import { deletePosition } from '@/shared/api/positionsApi';

export function useDeletePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DeletePositionPayload) => deletePosition(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}
