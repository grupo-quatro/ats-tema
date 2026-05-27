'use client';

import { useRouter } from 'next/navigation';
import type { ApplicationWithCandidateDTO } from '@ats/shared-types';
import CandidatePipeline from './CandidatePipeline';

export const CANDIDATE_SESSION_KEY = 'pipeline:candidate';

type Props = {
  jobId: string;
  jobTitle: string;
};

export default function CandidatePipelineRoute({ jobId, jobTitle }: Props) {
  const router = useRouter();

  function handleViewCandidate(candidate: ApplicationWithCandidateDTO) {
    sessionStorage.setItem(CANDIDATE_SESSION_KEY, JSON.stringify(candidate));
    router.push(`/candidate/${candidate.candidateId}`);
  }

  return (
    <CandidatePipeline
      jobId={jobId}
      jobTitle={jobTitle}
      onViewCandidate={handleViewCandidate}
    />
  );
}
