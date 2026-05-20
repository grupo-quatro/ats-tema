import SuccessView from '@/features/postulation/components/SuccessView';
import type { CvParseStatus } from '@ats/shared-types';

type Props = {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ status?: string }>;
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

export default async function SuccessPage({ params, searchParams }: Props) {
  const { jobId } = await params;
  const { status } = await searchParams;

  let jobTitle: string | undefined;
  try {
    const res = await fetch(getJobDetailUrl(jobId), { cache: 'no-store' });
    if (res.ok) {
      const job = await res.json();
      jobTitle = job.title;
    }
  } catch {
    // fetch fallback: success view renders without title
  }

  return (
    <SuccessView
      cvParseStatus={(status as CvParseStatus) ?? 'pending'}
      jobTitle={jobTitle}
    />
  );
}
