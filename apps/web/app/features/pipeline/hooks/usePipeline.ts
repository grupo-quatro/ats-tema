'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApplicationStage } from '@ats/shared-types';

import { ApplicationFirebaseRepository } from '../../../repositories/firebase/application.firebase.repository';
import { PipelineService } from '../pipeline.service';

const service = new PipelineService(new ApplicationFirebaseRepository());

export function useGetCandidatesByJob(jobId: string) {
  return useQuery({
    queryKey: ['pipeline', jobId],
    queryFn: () => service.getCandidatesByJob(jobId),
    enabled: Boolean(jobId),
  });
}

export function useUpdateApplicationStage(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      applicationId,
      stage,
      notes,
    }: {
      applicationId: string;
      stage: ApplicationStage;
      notes?: string;
    }) => service.updateApplicationStage(applicationId, stage, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', jobId] });
    },
  });
}

export function useDiscardApplication(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      applicationId,
      rejectionReason,
    }: {
      applicationId: string;
      rejectionReason: string;
    }) => service.discardApplication(applicationId, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline', jobId] });
    },
  });
}
