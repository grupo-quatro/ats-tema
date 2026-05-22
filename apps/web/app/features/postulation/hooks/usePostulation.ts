'use client';

import { useMutation } from '@tanstack/react-query';

import type { CandidatePostulationPayload } from '@ats/shared-types';

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
