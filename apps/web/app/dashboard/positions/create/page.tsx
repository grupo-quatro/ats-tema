'use client';

import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Button,
  Alert,
  Snackbar,
  Typography,
} from '@mui/material';
import { ArrowLeft, BriefcaseBusiness } from 'lucide-react';
import { useState } from 'react';
import JobForm from '@/features/jobs/components/JobForm';
import { useCreateJob } from '@/features/jobs/hooks/useCreateJob';
import { CreateJobDTO } from '@ats/shared-types';

export default function CreateJobPage() {
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { mutate: createJob, isPending } = useCreateJob();

  const handleCreateJob = async (jobData: CreateJobDTO) => {
    createJob(jobData, {
      onSuccess: () => {
        setSuccessMessage('Posición creada exitosamente');

        setTimeout(() => {
          router.push('/dashboard/positions');
        }, 2000);
      },
      onError: (error) => {
        setErrorMessage(
          error instanceof Error ? error.message : 'Error al crear la posición',
        );

        setTimeout(() => setErrorMessage(''), 3000);
      },
    });
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
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              boxShadow: '0 8px 20px rgba(37,99,235,0.25)',
            }}
          >
            <BriefcaseBusiness size={24} color="#ffffff" />
          </Box>

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

        <JobForm
          onSubmit={handleCreateJob}
          isLoading={isPending}
          onCancel={() => router.push('/dashboard/positions')}
        />
      </Container>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success">{successMessage}</Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={3000}
        onClose={() => setErrorMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error">{errorMessage}</Alert>
      </Snackbar>
    </Box>
  );
}
