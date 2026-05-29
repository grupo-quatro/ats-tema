'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import type {
  CandidatePostulationPayload,
  ConfirmCandidateProfilePayload,
} from '@ats/shared-types';

import { CandidateFirebaseRepository } from '../../../repositories/firebase/candidate.firebase.repository';
import { PostulationService } from '../postulation.service';

const service = new PostulationService(new CandidateFirebaseRepository());

export function useRegisterManual() {
  return useMutation({
    mutationFn: ({
      payload,
      file,
    }: {
      payload: CandidatePostulationPayload;
      file?: File;
    }) => service.registerManual(payload, file),
  });
}

export function useRegisterCvFlow() {
  return useMutation({
    mutationFn: ({ jobId, file }: { jobId: string; file: File }) =>
      service.registerCvFlow(jobId, file),
  });
}

export function useCandidateProfileForConfirmation({
  candidateId,
  applicationId,
  enabled = true,
}: {
  candidateId?: string;
  applicationId?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['candidateProfileForConfirmation', candidateId, applicationId],
    queryFn: () =>
      service.getCandidateProfileForConfirmation(candidateId!, applicationId!),
    enabled: enabled && Boolean(candidateId) && Boolean(applicationId),
    refetchInterval: (query) => {
      const status = query.state.data?.cvParseStatus;
      return status === 'pending' || status === 'processing' ? 2000 : false;
    },
  });
}

export function useConfirmCandidateProfile() {
  return useMutation({
    mutationFn: (payload: ConfirmCandidateProfilePayload) =>
      service.confirmCandidateProfile(payload),
  });
}
