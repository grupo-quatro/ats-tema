'use client';

import { useRouter } from 'next/navigation';
import CandidatePipeline from './CandidatePipeline';

type Props = {
  jobId: string;
  jobTitle: string;
};

export default function CandidatePipelineRoute({ jobId, jobTitle }: Props) {
  const router = useRouter();

  return (
    <CandidatePipeline
      jobId={jobId}
      jobTitle={jobTitle}
      onViewCandidate={(candidateId) =>
        router.push(`/candidate/${candidateId}`)
      }
    />
  );
}
