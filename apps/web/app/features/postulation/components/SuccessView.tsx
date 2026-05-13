'use client';
import { Card, Container, Box, Typography, Button } from '@mui/material';
import { BadgeCheck, Mail, User } from 'lucide-react';
import { StatusInfoBlock } from './StatusInfoBlock';

export default function SuccessView() {
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
            Icon={User}
            title="Perfil Creado"
            description="Tu perfil ya está disponible para los reclutadores. Recibirás notificaciones sobre oportunidades."
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
