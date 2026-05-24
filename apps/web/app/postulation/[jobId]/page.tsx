import type { Metadata } from 'next';
import { ManualCandidateForm } from '@/features/postulation/components/manual-candidate-form/ManualCandidateForm';

type PostulationPageProps = {
  params: Promise<{ jobId: string }>;
};

import { getFunctionUrl } from '../../shared/lib/functions-url';

function getJobDetailUrl(jobId: string): string {
  return `${getFunctionUrl('getJobDetail')}?jobId=${jobId}`;
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
