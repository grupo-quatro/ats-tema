import { ManualCandidateForm } from '@/features/postulation/components/manual-candidate-form/ManualCandidateForm';

type ManualPostulationPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function ManualPostulationPage({
  params,
}: ManualPostulationPageProps) {
  const { jobId } = await params;
  return <ManualCandidateForm jobId={jobId} />;
}
