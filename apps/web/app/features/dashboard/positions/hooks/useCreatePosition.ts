'use client';

import { useMutation } from '@tanstack/react-query';
import type { CreateJobPayload } from '@ats/shared-types';

import { createPosition } from '@/shared/api/positionsApi';

export function useCreatePosition() {
  return useMutation({
    mutationFn: (jobData: CreateJobPayload) => createPosition(jobData),
  });
}
