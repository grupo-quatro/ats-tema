'use client';
import { Card, Container, Box, Typography, Button } from '@mui/material';
import { BadgeCheck, Clock, Mail } from 'lucide-react';
import type { CvParseStatus } from '@ats/shared-types';
import { StatusInfoBlock } from './StatusInfoBlock';

const CV_STATUS_LABELS: Record<CvParseStatus, string> = {
  pending: 'Tu CV está en cola para ser procesado.',
  processing: 'Tu CV se está procesando. Te notificaremos cuando esté listo.',
  done: 'Tu CV fue procesado correctamente.',
  failed: 'Hubo un problema al procesar tu CV. El equipo lo revisará.',
  not_required: 'No se requiere CV para esta postulación.',
};

type Props = { cvParseStatus: CvParseStatus };

export default function SuccessView({ cvParseStatus }: Props) {
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
            Tu perfil ha sido creado correctamente en nuestro sistema
          </Typography>
        </Box>

        <Box
          sx={{
            bgcolor: 'background.default',
            p: 3,
            borderRadius: 2,
            width: '100%',
            textAlign: 'left',
            border: '1px solid #e2e8f0',
          }}
        >
          <StatusInfoBlock
            Icon={Mail}
            title="Email de Confirmación"
            description="Hemos enviado un correo de confirmación a tu dirección de email. Por favor, verifica tu bandeja de entrada."
          />
          <StatusInfoBlock
            Icon={Clock}
            title="Estado del CV"
            description={CV_STATUS_LABELS[cvParseStatus]}
          />
        </Box>

        <Button
          variant="outlined"
          size="large"
          fullWidth
          sx={{
            borderColor: '#e2e8f0',
            backgroundColor: 'primary.main',
            color: 'white',
          }}
        >
          Nuevo Registro
        </Button>
      </Card>
    </Container>
  );
}
