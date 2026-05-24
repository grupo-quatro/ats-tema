'use client';

import { useMutation } from '@tanstack/react-query';
import { CreateJobDTO } from '@ats/shared-types';

import { createPosition } from '@/shared/api/positions-api';

export function useCreatePosition() {
  return useMutation({
    mutationFn: (jobData: CreateJobDTO) => createPosition(jobData),
  });
}
