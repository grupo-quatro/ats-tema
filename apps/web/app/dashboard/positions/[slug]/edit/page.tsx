import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, Typography } from '@mui/material';
import PositionEditView from '@/features/dashboard/positions/components/PositionEditView';
import { getJobBySlug } from '@/features/dashboard/positions/services/positions';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const job = getJobBySlug(slug);

  return {
    title: job
      ? `Editar ${job.title} | Tema Consulting`
      : 'Editar posición | Tema Consulting',
  };
}

export default async function EditPositionPage({ params }: Props) {
  const { slug } = await params;
  const job = getJobBySlug(slug);

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
