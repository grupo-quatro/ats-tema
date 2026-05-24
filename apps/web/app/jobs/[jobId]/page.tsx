import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JobDescription from '@/features/jobs/components/JobDescription';
import type { Job } from '../../../../../packages/shared-types/src/models/job';

interface JobPageProps {
  params: Promise<{ jobId: string }>;
}

import { getFunctionUrl } from '../../shared/lib/firebase';

async function fetchJob(jobId: string): Promise<Job | null> {
  const res = await fetch(`${getFunctionUrl('getJobDetail')}?jobId=${jobId}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Error al obtener el detalle del puesto');
  return res.json();
}

export async function generateMetadata({
  params,
}: JobPageProps): Promise<Metadata> {
  const { jobId } = await params;
  const job = await fetchJob(jobId);
  return {
    title: job
      ? `${job.title} | Tema Consulting`
      : 'Posición | Tema Consulting',
  };
}

export default async function JobDetailPage({ params }: JobPageProps) {
  const { jobId } = await params;
  const job = await fetchJob(jobId);

  if (!job) return notFound();

  return <JobDescription job={job} />;
}
