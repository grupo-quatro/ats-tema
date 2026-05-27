import type { Metadata } from 'next';
import type { Job } from '@ats/shared-types';
import CandidatePipelineRoute from '@/features/pipeline/components/CandidatePipelineRoute';
import { getFunctionUrl } from '@/shared/lib/functionsUrl';

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ title?: string }>;
};

async function fetchPosition(id: string): Promise<Job | null> {
  const token = 'dev-recruiter';
  try {
    const res = await fetch(`${getFunctionUrl('getPosition')}?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Error al obtener la posición');

    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await fetchPosition(id);

  return {
    title: job
      ? `Candidatos ${job.title} | Tema Consulting`
      : 'Candidatos de posición | Tema Consulting',
  };
}

export default async function PositionCandidatesPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const job = await fetchPosition(id);
  const titleFromQuery = resolvedSearchParams?.title;
  const jobTitle = job?.title ?? titleFromQuery ?? 'Posición seleccionada';

  return <CandidatePipelineRoute jobId={job?.id ?? id} jobTitle={jobTitle} />;
}
