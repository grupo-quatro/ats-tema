'use client';
import { Card, Container, Box, Typography, Button } from '@mui/material';
import { BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import type { CvParseStatus } from '@ats/shared-types';

type Props = { cvParseStatus?: CvParseStatus; jobTitle?: string };

export default function SuccessView({ jobTitle }: Props) {
  return (
    <Container sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
      <Card
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 4,
          gap: 3,
          maxWidth: '600px',
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            bgcolor: 'success.light',
            borderRadius: '50%',
            color: 'success.main',
            flexShrink: 0,
          }}
        >
          <BadgeCheck size={48} />
        </Box>

        <Box>
          <Typography variant="h1" gutterBottom>
            ¡Registro Exitoso!
          </Typography>
          <Typography variant="body1">
            Tu perfil ha sido creado correctamente en nuestro sistema para
          </Typography>
          {jobTitle && (
            <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>
              {jobTitle}
            </Typography>
          )}
          <Typography variant="body2">
            Recibirás actualizaciones sobre el estado de tu postulación a través
            de tu correo
          </Typography>
        </Box>

        <Button
          variant="outlined"
          component={Link}
          href="/"
          size="large"
          fullWidth
          sx={{
            borderColor: '#e2e8f0',
            backgroundColor: 'primary.main',
            color: 'white',
          }}
        >
          Ver más ofertas
        </Button>
      </Card>
    </Container>
  );
}
