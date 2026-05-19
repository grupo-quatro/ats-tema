import type { Metadata } from 'next';
import { ManualCandidateForm } from '@/features/postulation/components/manual-candidate-form/ManualCandidateForm';

type PostulationPageProps = {
  params: Promise<{ jobId: string }>;
};

function getJobDetailUrl(jobId: string): string {
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = process.env.NEXT_PUBLIC_FUNCTIONS_REGION ?? 'us-central1';

  if (useEmulators) {
    return `http://127.0.0.1:5001/${projectId}/${region}/getJobDetail?jobId=${jobId}`;
  }
  return `https://${region}-${projectId}.cloudfunctions.net/getJobDetail?jobId=${jobId}`;
}

export async function generateMetadata({
  params,
}: PostulationPageProps): Promise<Metadata> {
  const { jobId } = await params;
  try {
    const res = await fetch(getJobDetailUrl(jobId), { cache: 'no-store' });
    if (res.ok) {
      const job = await res.json();
      return { title: `Postulación: ${job.title} | Tema Consulting` };
    }
  } catch {
    // fetch fallback: form renders without title
  }
  return { title: 'Postulación | Tema Consulting' };
}

export default async function PostulationPage({
  params,
}: PostulationPageProps) {
  const { jobId } = await params;

  let jobTitle: string | undefined;
  try {
    const res = await fetch(getJobDetailUrl(jobId), { cache: 'no-store' });
    if (res.ok) {
      const job = await res.json();
      jobTitle = job.title;
    }
  } catch {
    // fetch fallback: form renders without title
  }

  return <ManualCandidateForm jobId={jobId} jobTitle={jobTitle} />;
}
