import { CvUploadView } from '@/features/postulation/components/cv-upload/CvUploadView';

type CvPostulationPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function CvPostulationPage({
  params,
}: CvPostulationPageProps) {
  const { jobId } = await params;
  return <CvUploadView jobId={jobId} />;
}
