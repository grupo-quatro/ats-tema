import PostulationView from '@/features/postulation/PostulationView';

type PostulationPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function PostulationPage({
  params,
}: PostulationPageProps) {
  const { jobId } = await params;
  return <PostulationView jobId={jobId} />;
}
