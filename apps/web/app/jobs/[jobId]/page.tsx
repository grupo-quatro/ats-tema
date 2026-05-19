import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JobDescription from '@/features/jobs/components/JobDescription';
import type { Job } from '../../../../../packages/shared-types/src/models/job';

interface JobPageProps {
  params: Promise<{ jobId: string }>;
}

function getJobDetailUrl(jobId: string): string {
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = process.env.NEXT_PUBLIC_FUNCTIONS_REGION ?? 'us-central1';

  if (useEmulators) {
    return `http://127.0.0.1:5001/${projectId}/${region}/getJobDetail?jobId=${jobId}`;
  }
  return `https://${region}-${projectId}.cloudfunctions.net/getJobDetail?jobId=${jobId}`;
}

async function fetchJob(jobId: string): Promise<Job | null> {
  const res = await fetch(getJobDetailUrl(jobId), { cache: 'no-store' });
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
