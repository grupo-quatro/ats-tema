'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PublicOfferResponse } from '@ats/shared-types';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CheckCircle2, FileSignature, XCircle } from 'lucide-react';
import { getPublicOffer, respondOffer } from '@/shared/api/offersApi';

interface PublicOfferViewProps {
  token: string;
}

function getStatusCopy(status: PublicOfferResponse['status']) {
  if (status === 'accepted') {
    return {
      label: 'Aceptada',
      severity: 'success' as const,
      message: 'Tu respuesta ya fue registrada correctamente.',
    };
  }
  if (status === 'declined') {
    return {
      label: 'Rechazada',
      severity: 'warning' as const,
      message: 'El rechazo de la oferta ya fue registrado.',
    };
  }
  if (status === 'expired') {
    return {
      label: 'Vencida',
      severity: 'warning' as const,
      message: 'La oferta ya no se encuentra vigente.',
    };
  }
  if (status === 'cancelled') {
    return {
      label: 'Cancelada',
      severity: 'warning' as const,
      message: 'La oferta fue anulada internamente.',
    };
  }
  return {
    label: 'Pendiente',
    severity: 'info' as const,
    message: 'Revisá la carta oferta y registrá tu respuesta.',
  };
}

export function PublicOfferView({ token }: PublicOfferViewProps) {
  const [offer, setOffer] = useState<PublicOfferResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getPublicOffer(token)
      .then((response) => {
        setOffer(response);
        setSignerName(response.candidateName);
      })
      .catch((error) => {
        setError(
          error instanceof Error
            ? error.message
            : 'No pudimos cargar la carta oferta',
        );
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const statusCopy = useMemo(
    () => getStatusCopy(offer?.status ?? 'sent'),
    [offer?.status],
  );
  const canRespond = offer?.status === 'sent';

  const handleResponse = async (action: 'accept' | 'decline') => {
    if (action === 'accept' && !signerName.trim()) {
      setError('Ingresá tu nombre para aceptar la oferta.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const response = await respondOffer({
        token,
        action,
        signerName: action === 'accept' ? signerName.trim() : undefined,
        declineReason:
          action === 'decline' ? declineReason.trim() || undefined : undefined,
      });
      setOffer((current) =>
        current ? { ...current, status: response.status } : current,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No pudimos registrar tu respuesta',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !offer) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!offer) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <FileSignature size={20} color="#2563eb" />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Carta oferta
              </Typography>
            </Box>
            <Typography color="text.secondary">
              {offer.jobTitle} · {offer.candidateName}
            </Typography>
          </Box>

          <Alert severity={statusCopy.severity}>{statusCopy.message}</Alert>

          <Card>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
                mb: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Estado de la oferta
              </Typography>
              <Chip label={statusCopy.label} size="small" />
            </Box>
            <Divider sx={{ mb: 3 }} />
            <Box
              sx={{
                '& h1, & h2, & h3': {
                  color: 'text.primary',
                  lineHeight: 1.25,
                },
                '& p, & li': {
                  color: 'text.secondary',
                  fontSize: 15,
                  lineHeight: 1.7,
                },
                '& ul': { pl: 3 },
              }}
              dangerouslySetInnerHTML={{ __html: offer.documentHtml }}
            />
          </Card>

          {canRespond ? (
            <Card>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: 'text.secondary', mb: 2 }}
              >
                Respuesta del candidato
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Nombre completo"
                  value={signerName}
                  onChange={(event) => setSignerName(event.target.value)}
                  fullWidth
                />
                <TextField
                  label="Motivo de rechazo (opcional)"
                  value={declineReason}
                  onChange={(event) => setDeclineReason(event.target.value)}
                  minRows={3}
                  multiline
                  fullWidth
                />
                {error ? <Alert severity="error">{error}</Alert> : null}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle2 size={16} />}
                    onClick={() => handleResponse('accept')}
                    disabled={isSubmitting}
                    sx={{ textTransform: 'none' }}
                  >
                    Aceptar oferta
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<XCircle size={16} />}
                    onClick={() => handleResponse('decline')}
                    disabled={isSubmitting}
                    sx={{ textTransform: 'none' }}
                  >
                    Rechazar oferta
                  </Button>
                </Box>
              </Stack>
            </Card>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
