'use client';

import { useRouter } from 'next/navigation';
import { Container, Box, Button, Typography } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import PositionForm from '@/features/dashboard/positions/components/PositionForm';
import { useCreatePosition } from '@/features/dashboard/positions/hooks/useCreatePosition';
import type { CreateJobPayload } from '@ats/shared-types';
import AppSnackbar, {
  type AppSnackbarState,
} from '@/shared/components/AppSnackbar';

export default function CreateJobPage() {
  const router = useRouter();
  const [snackbar, setSnackbar] = useState<AppSnackbarState>(null);
  const { mutateAsync: createJob, isPending } = useCreatePosition();

  const handleCreateJob = async (jobData: CreateJobPayload) => {
    setSnackbar(null);

    try {
      await createJob(jobData);
      setSnackbar({
        message: 'Posicion creada exitosamente',
        severity: 'success',
      });

      setTimeout(() => {
        router.push('/dashboard/positions');
      }, 2000);
    } catch (error) {
      setSnackbar({
        message:
          error instanceof Error ? error.message : 'Error al crear la posicion',
        severity: 'error',
      });
    }
  };

  return (
    <Box
      sx={{
        bgcolor: '#eef2f7',
        minHeight: '100vh',
        py: 3,
      }}
    >
      <Container maxWidth="lg">
        <Button
          startIcon={<ArrowLeft size={16} />}
          onClick={() => router.push('/dashboard/positions')}
          sx={{
            textTransform: 'none',
            bgcolor: '#ffffff',
            border: '1px solid #dbe2ea',
            borderRadius: '10px',
            color: '#475569',
            px: 2,
            py: 1,
            fontSize: '0.8rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            '&:hover': {
              bgcolor: '#f8fafc',
            },
          }}
        >
          Volver al Listado
        </Button>

        <Box
          sx={{
            mt: 3,
            mb: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography
            sx={{
              fontSize: '1.9rem',
              fontWeight: 500,
              color: '#111827',
            }}
          >
            Nueva Posicion
          </Typography>

          <Typography
            sx={{
              mt: 1,
              color: '#6b7280',
              fontSize: '0.9rem',
            }}
          >
            Define los criterios de evaluación para el matching de candidatos
          </Typography>
        </Box>

        <PositionForm
          onSubmit={handleCreateJob}
          isLoading={isPending}
          onCancel={() => router.push('/dashboard/positions')}
        />
      </Container>

      <AppSnackbar snackbar={snackbar} onClose={() => setSnackbar(null)} />
    </Box>
  );
}
