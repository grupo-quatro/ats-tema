'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Offer, OfferStatus } from '@ats/shared-types';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircle2,
  Copy,
  Eye,
  FileSignature,
  Pencil,
  Send,
  XCircle,
} from 'lucide-react';
import {
  createOfferDraft,
  getOfferByApplication,
  previewOffer,
  sendOffer,
  updateOfferDraft,
} from '@/shared/api/offersApi';
import {
  emailLogsQueryKey,
  failedEmailLogsQueryKey,
} from '../hooks/useEmailLogs';

interface OfferManagementCardProps {
  applicationId: string;
  candidateId: string;
  disabled?: boolean;
  isMarkingHired?: boolean;
  onOfferSent: () => void;
  onMarkAsHired: () => Promise<void>;
}

type DraftFormState = {
  compensation: string;
  startDate: string;
  modality: string;
  benefits: string;
  expirationDate: string;
  observations: string;
};

const EMPTY_DRAFT_FORM: DraftFormState = {
  compensation: '',
  startDate: '',
  modality: '',
  benefits: '',
  expirationDate: '',
  observations: '',
};

const STATUS_CONFIG: Record<
  OfferStatus | 'none',
  { label: string; color: string; bgcolor: string }
> = {
  none: { label: 'Sin carta', color: '#475569', bgcolor: '#f1f5f9' },
  draft: { label: 'Borrador', color: '#0369a1', bgcolor: '#e0f2fe' },
  sent: { label: 'Enviada', color: '#1d4ed8', bgcolor: '#dbeafe' },
  accepted: { label: 'Aceptada', color: '#15803d', bgcolor: '#dcfce7' },
  declined: { label: 'Rechazada', color: '#dc2626', bgcolor: '#fee2e2' },
  expired: { label: 'Vencida', color: '#b45309', bgcolor: '#fef3c7' },
  cancelled: { label: 'Cancelada', color: '#475569', bgcolor: '#f1f5f9' },
};

function formatDate(value?: string | Date) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('es-AR');
}

function getOfferDescription(offer: Offer | null) {
  if (!offer) {
    return 'Todavía no se generó una carta oferta para esta candidatura.';
  }
  if (offer.status === 'draft') {
    return 'La carta está en borrador y puede publicarse cuando la propuesta esté revisada.';
  }
  if (offer.status === 'sent') {
    return 'El link público ya fue generado para que el candidato revise y responda la propuesta.';
  }
  if (offer.status === 'accepted') {
    return 'La oferta fue aceptada por el candidato. La contratación aún debe confirmarse manualmente.';
  }
  if (offer.status === 'declined') {
    return 'El candidato rechazó la oferta.';
  }
  return 'La carta oferta ya no está activa.';
}

function buildBenefits(value: string) {
  return value
    .split(/[\n,]/)
    .map((benefit) => benefit.trim())
    .filter(Boolean);
}

function buildDraftForm(offer: Offer): DraftFormState {
  return {
    compensation: offer.compensation ?? '',
    startDate: offer.startDate ?? '',
    modality: offer.modality ?? '',
    benefits: offer.benefits?.join('\n') ?? '',
    expirationDate: offer.expirationDate ?? '',
    observations: offer.observations ?? '',
  };
}

export function OfferManagementCard({
  applicationId,
  candidateId,
  disabled = false,
  isMarkingHired = false,
  onOfferSent,
  onMarkAsHired,
}: OfferManagementCardProps) {
  const queryClient = useQueryClient();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [publicUrl, setPublicUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [sendConfirmationOpen, setSendConfirmationOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [form, setForm] = useState<DraftFormState>(EMPTY_DRAFT_FORM);
  const [feedback, setFeedback] = useState<{
    severity: 'success' | 'error';
    message: string;
  } | null>(null);

  const statusConfig = STATUS_CONFIG[offer?.status ?? 'none'];
  const canPublish = offer?.status === 'draft' && !disabled;
  const canMarkAsHired = offer?.status === 'accepted' && !disabled;

  const loadOffer = useCallback(async () => {
    if (!applicationId) return;
    setIsLoading(true);
    try {
      const response = await getOfferByApplication(applicationId);
      setOffer(response.offer);
    } catch (error) {
      setFeedback({
        severity: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo obtener la carta oferta',
      });
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    loadOffer();
  }, [loadOffer]);

  const offerDates = useMemo(
    () =>
      [
        { label: 'Enviada', value: formatDate(offer?.sentAt) },
        { label: 'Vencimiento', value: formatDate(offer?.expirationDate) },
        {
          label: 'Respondida',
          value: formatDate(offer?.acceptedAt ?? offer?.declinedAt),
        },
      ].filter((item) => item.value),
    [offer],
  );

  const handleCreateDraft = async () => {
    setIsCreating(true);
    setFeedback(null);
    try {
      const draftData = {
        compensation: form.compensation.trim() || undefined,
        startDate: form.startDate || undefined,
        modality: form.modality.trim() || undefined,
        benefits: buildBenefits(form.benefits),
        expirationDate: form.expirationDate || undefined,
        observations: form.observations.trim() || undefined,
      };
      const response = offer
        ? await updateOfferDraft({ offerId: offer.id, ...draftData })
        : await createOfferDraft({ applicationId, ...draftData });
      setOffer(response.offer);
      setDialogOpen(false);
      setForm(EMPTY_DRAFT_FORM);
      setFeedback({
        severity: 'success',
        message: offer
          ? 'Borrador de carta oferta actualizado'
          : 'Carta oferta creada en borrador',
      });
    } catch (error) {
      setFeedback({
        severity: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo crear la carta oferta',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEditDraft = () => {
    if (!offer) return;
    setForm(buildDraftForm(offer));
    setDialogOpen(true);
  };

  const handlePreviewOffer = async () => {
    if (!offer) return;
    setIsPreviewing(true);
    setFeedback(null);
    try {
      const response = await previewOffer({ offerId: offer.id });
      setPreviewHtml(response.documentHtml);
      setPreviewDialogOpen(true);
    } catch (error) {
      setFeedback({
        severity: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo previsualizar la carta oferta',
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSendOffer = async () => {
    if (!offer) return;
    setIsSending(true);
    setFeedback(null);
    try {
      const response = await sendOffer({ offerId: offer.id });
      setOffer(response.offer);
      setPublicUrl(response.publicUrl);
      setSendConfirmationOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: emailLogsQueryKey(candidateId),
        }),
        queryClient.invalidateQueries({
          queryKey: failedEmailLogsQueryKey(applicationId),
        }),
      ]);
      onOfferSent();
      setFeedback({
        severity: 'success',
        message: 'Carta oferta enviada al candidato',
      });
    } catch (error) {
      setFeedback({
        severity: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo enviar la carta oferta',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setFeedback({ severity: 'success', message: 'Link copiado' });
  };

  return (
    <Card>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileSignature size={16} color="#64748b" />
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: 'text.secondary' }}
          >
            Carta oferta
          </Typography>
        </Box>
        <Chip
          label={statusConfig.label}
          size="small"
          sx={{
            bgcolor: statusConfig.bgcolor,
            color: statusConfig.color,
            fontWeight: 600,
            fontSize: 12,
            borderRadius: '6px',
            height: 24,
          }}
        />
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {getOfferDescription(offer)}
          </Typography>

          {offer ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {offer.compensation && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Compensación
                  </Typography>
                  <Typography variant="body2">{offer.compensation}</Typography>
                </Box>
              )}
              {offer.modality && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Modalidad
                  </Typography>
                  <Typography variant="body2">{offer.modality}</Typography>
                </Box>
              )}
              {offerDates.map((item) => (
                <Box key={item.label}>
                  <Typography variant="caption" color="text.secondary">
                    {item.label}
                  </Typography>
                  <Typography variant="body2">{item.value}</Typography>
                </Box>
              ))}
            </Box>
          ) : null}

          {offer?.status === 'declined' && offer.declineReason ? (
            <Alert severity="warning" icon={<XCircle size={18} />}>
              Motivo: {offer.declineReason}
            </Alert>
          ) : null}

          {publicUrl ? (
            <Alert
              severity="info"
              action={
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<Copy size={14} />}
                  onClick={handleCopyLink}
                  sx={{ textTransform: 'none' }}
                >
                  Copiar
                </Button>
              }
            >
              Carta oferta enviada por email. También podés copiar el link
              público.
            </Alert>
          ) : offer?.status === 'sent' ? (
            <Alert severity="info">
              Por seguridad, el link completo se muestra únicamente al momento
              de publicarlo.
            </Alert>
          ) : null}

          {feedback ? (
            <Alert severity={feedback.severity}>{feedback.message}</Alert>
          ) : null}

          <Divider />

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {!offer && (
              <Button
                variant="contained"
                onClick={() => setDialogOpen(true)}
                disabled={disabled}
                sx={{ textTransform: 'none' }}
              >
                Generar carta oferta
              </Button>
            )}

            {canPublish && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<Pencil size={16} />}
                  onClick={handleOpenEditDraft}
                  disabled={isCreating || isSending}
                  sx={{ textTransform: 'none' }}
                >
                  Editar borrador
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Eye size={16} />}
                  onClick={handlePreviewOffer}
                  disabled={isPreviewing || isSending}
                  sx={{ textTransform: 'none' }}
                >
                  {isPreviewing ? 'Cargando...' : 'Previsualizar carta'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Send size={16} />}
                  onClick={() => setSendConfirmationOpen(true)}
                  disabled={isSending}
                  sx={{ textTransform: 'none' }}
                >
                  {isSending ? 'Enviando...' : 'Enviar carta oferta'}
                </Button>
              </>
            )}

            {canMarkAsHired && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle2 size={16} />}
                onClick={onMarkAsHired}
                disabled={isMarkingHired}
                sx={{ textTransform: 'none' }}
              >
                {isMarkingHired ? 'Actualizando...' : 'Marcar como contratado'}
              </Button>
            )}
          </Box>
        </Stack>
      )}

      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Previsualización de carta oferta</DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: { xs: 2, sm: 4 },
              '& h1': { fontSize: 28 },
              '& h2': { fontSize: 20, mt: 3 },
              '& p, & li': { lineHeight: 1.6 },
            }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPreviewDialogOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cerrar
          </Button>
          <Button
            variant="outlined"
            startIcon={<Pencil size={16} />}
            onClick={() => {
              setPreviewDialogOpen(false);
              handleOpenEditDraft();
            }}
            sx={{ textTransform: 'none' }}
          >
            Editar borrador
          </Button>
          <Button
            variant="contained"
            startIcon={<Send size={16} />}
            onClick={() => {
              setPreviewDialogOpen(false);
              setSendConfirmationOpen(true);
            }}
            sx={{ textTransform: 'none' }}
          >
            Continuar al envío
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={sendConfirmationOpen}
        onClose={() => !isSending && setSendConfirmationOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirmar envío de carta oferta</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            ¿Confirmás el envío del correo con la carta oferta al candidato?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSendConfirmationOpen(false)}
            disabled={isSending}
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSendOffer}
            disabled={isSending}
            startIcon={
              isSending ? <CircularProgress size={16} /> : <Send size={16} />
            }
            sx={{ textTransform: 'none' }}
          >
            {isSending ? 'Enviando...' : 'Confirmar envío'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {offer ? 'Editar borrador de carta oferta' : 'Generar carta oferta'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Los campos pueden ajustarse manualmente. Si quedan vacíos, el
              backend completa la propuesta con datos disponibles de la
              posición.
            </Alert>
            <TextField
              label="Compensación"
              value={form.compensation}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  compensation: event.target.value,
                }))
              }
              placeholder="ARS 1.500.000 bruto mensual"
              fullWidth
            />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              <TextField
                label="Fecha estimada de inicio"
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label="Vigencia de la oferta"
                type="date"
                value={form.expirationDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    expirationDate: event.target.value,
                  }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Box>
            <TextField
              label="Modalidad"
              value={form.modality}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  modality: event.target.value,
                }))
              }
              placeholder="Remoto, híbrido, presencial"
              fullWidth
            />
            <TextField
              label="Beneficios"
              value={form.benefits}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  benefits: event.target.value,
                }))
              }
              placeholder="Separá beneficios con coma o salto de línea"
              minRows={2}
              multiline
              fullWidth
            />
            <TextField
              label="Observaciones"
              value={form.observations}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  observations: event.target.value,
                }))
              }
              minRows={3}
              multiline
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateDraft}
            disabled={isCreating}
            sx={{ textTransform: 'none' }}
          >
            {isCreating
              ? 'Guardando...'
              : offer
                ? 'Guardar cambios'
                : 'Crear borrador'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
