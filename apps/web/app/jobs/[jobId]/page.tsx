import { notFound } from 'next/navigation';
import JobDescription from '@/features/jobs/components/JobDescription';
import { JOBS_DATA } from '@/features/jobs/services/jobs';

interface JobPageProps {
  // Aseguramos que params sea una Promesa
  params: Promise<{
    jobId: string;
  }>;
}

// Transformamos la función en async
export default async function PostulationPage({ params }: JobPageProps) {
  // Resolvemos la promesa de params
  const resolvedParams = await params;
  const jobId = resolvedParams.jobId;
  const normalizedJobId = jobId?.toString().trim();

  console.log('Received jobId:', jobId);
  console.log('Normalized jobId:', normalizedJobId);

  const job = JOBS_DATA.find((jobItem) => jobItem.id === normalizedJobId);

  if (!job) {
    return notFound();
  }

  return <JobDescription job={job} />;
}
