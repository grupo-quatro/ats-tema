import { notFound } from 'next/navigation';
import { CandidateProfileView } from '@/features/candidate/components/CandidateProfileView';
import { CANDIDATES_MOCK } from '@/features/candidate/mock/candidateMock';

interface CandidatePageProps {
  params: Promise<{ candidateId: string }>;
}

export default async function CandidatePage({ params }: CandidatePageProps) {
  const { candidateId } = await params;

  const candidate = CANDIDATES_MOCK.find((c) => c.id === candidateId);

  if (!candidate) {
    return notFound();
  }

  return <CandidateProfileView candidate={candidate} />;
}
