import SuccessView from '@/features/postulation/components/SuccessView';
import type { CvParseStatus } from '@ats/shared-types';

type Props = {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ status?: string }>;
};

import { getFunctionUrl } from '../../../shared/lib/functionsUrl';

function getJobDetailUrl(jobId: string): string {
  return `${getFunctionUrl('getJobDetail')}?jobId=${jobId}`;
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
