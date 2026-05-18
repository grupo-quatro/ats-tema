'use client';

import { Container, Typography, Box, Stack } from '@mui/material';
import { FileText, Upload } from 'lucide-react';
import { MethodCard } from './MethodCard';

export default function PostulationView() {
  return (
    <Container
      maxWidth="lg"
      sx={{
        py: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'primary.main',
          p: 2.5,
          borderRadius: '50%',
          mb: 1,
        }}
      >
        <FileText color="white" size={24} />
      </Box>

      <Typography variant="h1" sx={{ mb: 0.5 }}>
        Registro de Candidato
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 6 }}>
        Selecciona cómo deseas completar tu perfil profesional
      </Typography>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        sx={{ width: '100%', justifyContent: 'center', mb: 6 }}
      >
        <MethodCard
          Icon={Upload}
          title="Subir CV"
          description="Carga tu currículum y extraeremos automáticamente tu información"
          badgeText="Más rápido"
        />

        <MethodCard
          Icon={FileText}
          title="Carga Manual"
          description="Completa el formulario manualmente con tu información profesional"
          badgeText="Más control"
        />
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Tus datos están protegidos y serán tratados de forma confidencial
      </Typography>
    </Container>
  );
}
