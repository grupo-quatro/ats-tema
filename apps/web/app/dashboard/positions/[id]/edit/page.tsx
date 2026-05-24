import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, Typography } from '@mui/material';
import PositionEditView from '@/features/dashboard/positions/components/PositionEditView';
import { getFunctionUrl } from '@/shared/lib/functions-url';
import type { Job } from '@ats/shared-types';

type Props = {
  params: Promise<{ id: string }>;
};

async function fetchPosition(id: string): Promise<Job | null> {
  const res = await fetch(`${getFunctionUrl('getPosition')}?id=${id}`, {
    headers: { Authorization: 'Bearer dev-recruiter' },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await fetchPosition(id);
  return {
    title: job
      ? `Editar ${job.title} | Tema Consulting`
      : 'Editar posición | Tema Consulting',
  };
}

export default async function EditPositionPage({ params }: Props) {
  const { id } = await params;
  const job = await fetchPosition(id);

  if (!job) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h1" sx={{ mb: 2 }}>
          Posición no encontrada
        </Typography>
        <Link href="/dashboard/positions">Volver a posiciones</Link>
      </Container>
    );
  }

  return <PositionEditView job={job} />;
}
