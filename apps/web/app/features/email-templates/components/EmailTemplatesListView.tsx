'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Edit3, FileText, Mail, Plus, Trash2 } from 'lucide-react';
import type { EmailTemplate, EmailTemplateStage } from '@ats/shared-types';
import {
  EMAIL_TEMPLATE_STAGE_LABELS,
  EMAIL_TEMPLATE_VARIABLES,
} from '../emailTemplates.service';
import {
  useDeleteEmailTemplate,
  useEmailTemplates,
} from '../hooks/useEmailTemplates';
import PaginationControls from '@/shared/components/PaginationControls';
import { usePaginationParams } from '@/shared/lib/usePaginationParams';
import AppSnackbar, {
  type AppSnackbarState,
} from '@/shared/components/AppSnackbar';

const STAGE_COLORS: Record<
  EmailTemplateStage,
  { color: string; background: string }
> = {
  application_received: { color: '#2563eb', background: '#dbeafe' },
  sch_interview_hr_1: { color: '#334155', background: '#f1f5f9' },
  interview_hr_1: { color: '#16a34a', background: '#dcfce7' },
  sch_interview_hr_2: { color: '#334155', background: '#f1f5f9' },
  interview_hr_2: { color: '#16a34a', background: '#dcfce7' },
  sch_interview_tech_1: { color: '#334155', background: '#f1f5f9' },
  interview_tech_1: { color: '#2563eb', background: '#dbeafe' },
  sch_interview_tech_2: { color: '#334155', background: '#f1f5f9' },
  interview_tech_2: { color: '#2563eb', background: '#dbeafe' },
  onsite_interview: { color: '#7c3aed', background: '#ede9fe' },
  offer: { color: '#16a34a', background: '#dcfce7' },
  hired: { color: '#16a34a', background: '#dcfce7' },
  rejected: { color: '#64748b', background: '#f1f5f9' },
  withdrawn: { color: '#64748b', background: '#f1f5f9' },
};

const EMAIL_TEMPLATES_PAGE_SIZE = 5;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-CA').format(date);
}

function TemplateCard({
  template,
  onDelete,
  isDeleting,
}: {
  template: EmailTemplate;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const stageColor = STAGE_COLORS[template.stage];

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: '16px',
        bgcolor: '#ffffff',
        boxShadow: '0 14px 32px rgba(15, 23, 42, 0.08)',
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ justifyContent: 'space-between', gap: 1.5 }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
            <Typography
              variant="h2"
              sx={{ fontSize: 20, lineHeight: 1.2, color: '#0f172a' }}
            >
              {template.name}
            </Typography>
            <Chip
              size="small"
              label={EMAIL_TEMPLATE_STAGE_LABELS[template.stage]}
              sx={{
                bgcolor: stageColor.background,
                color: stageColor.color,
                fontWeight: 500,
              }}
            />
          </Stack>
        </Stack>

        <Typography sx={{ color: '#475569' }}>
          <Box component="span" sx={{ fontWeight: 500 }}>
            Asunto:
          </Box>{' '}
          {template.subject}
        </Typography>

        <Box
          sx={{
            bgcolor: '#f8fafc',
            borderRadius: '8px',
            px: 2,
            py: 1.75,
            minHeight: 86,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Typography sx={{ color: '#334155', lineHeight: 1.5 }}>
            {template.body}
          </Typography>
        </Box>

        <Stack
          direction="row"
          sx={{ flexWrap: 'wrap', gap: 2, color: '#64748b' }}
        >
          <Typography sx={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
            Creada: {formatDate(template.createdAt)}
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#64748b' }}>•</Typography>
          <Typography sx={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
            Modificada: {formatDate(template.updatedAt)}
          </Typography>
        </Stack>

        <Divider />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            component={Link}
            href={`/dashboard/communication-templates/${template.id}/edit`}
            variant="outlined"
            startIcon={<Edit3 size={17} />}
            fullWidth
            sx={{
              color: '#334155',
              borderColor: '#e2e8f0',
              py: 1.15,
              '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
            }}
          >
            Editar
          </Button>
          <Button
            variant="outlined"
            startIcon={
              isDeleting ? (
                <CircularProgress color="inherit" size={17} />
              ) : (
                <Trash2 size={17} />
              )
            }
            onClick={() => onDelete(template.id)}
            disabled={isDeleting}
            sx={{
              color: '#ef4444',
              borderColor: '#fecaca',
              px: 3,
              py: 1.15,
              '&:hover': { borderColor: '#fca5a5', bgcolor: '#fff1f2' },
            }}
          >
            Eliminar
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function EmailTemplatesListView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: templates = [], isLoading, isError } = useEmailTemplates();
  const deleteMutation = useDeleteEmailTemplate();
  const { page, setPage } = usePaginationParams();
  const [snackbar, setSnackbar] = useState<AppSnackbarState>(null);
  const totalPages = Math.max(
    1,
    Math.ceil(templates.length / EMAIL_TEMPLATES_PAGE_SIZE),
  );
  const paginatedTemplates = useMemo(() => {
    const start = (page - 1) * EMAIL_TEMPLATES_PAGE_SIZE;
    return templates.slice(start, start + EMAIL_TEMPLATES_PAGE_SIZE);
  }, [page, templates]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, setPage, totalPages]);

  useEffect(() => {
    const toast = searchParams.get('toast');
    if (!toast) return;

    const messages: Record<string, string> = {
      'template-created': 'Plantilla creada correctamente',
      'template-updated': 'Plantilla actualizada correctamente',
    };

    const message = messages[toast];
    if (!message) return;

    setSnackbar({ message, severity: 'success' });
    router.replace('/dashboard/communication-templates', { scroll: false });
  }, [router, searchParams]);

  function handleDelete(id: string) {
    const shouldDelete = window.confirm(
      '¿Querés eliminar esta plantilla de comunicación?',
    );
    if (!shouldDelete) return;

    deleteMutation.mutate(id, {
      onSuccess: () => {
        setSnackbar({
          message: 'Plantilla eliminada correctamente',
          severity: 'success',
        });
      },
      onError: (error) => {
        setSnackbar({
          message:
            error instanceof Error
              ? error.message
              : 'No se pudo eliminar la plantilla.',
          severity: 'error',
        });
      },
    });
  }

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Stack spacing={5}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{
            justifyContent: 'space-between',
            alignItems: { md: 'center' },
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: '#2563eb',
                color: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Mail size={32} />
            </Box>
            <Box>
              <Typography variant="h1">Plantillas de Comunicación</Typography>
              <Typography sx={{ color: '#64748b', mt: 0.5 }}>
                Gestiona las plantillas de emails automáticos para candidatos
              </Typography>
            </Box>
          </Stack>

          <Button
            component={Link}
            href="/dashboard/communication-templates/create"
            variant="contained"
            startIcon={<Plus size={18} />}
            sx={{
              px: 3,
              py: 1.25,
              bgcolor: '#2563eb',
              boxShadow: '0 12px 20px rgba(37,99,235,0.25)',
              '&:hover': { bgcolor: '#1d4ed8' },
            }}
          >
            Nueva Plantilla
          </Button>
        </Stack>

        <Box
          sx={{
            border: '1px solid #bfdbfe',
            bgcolor: '#eff6ff',
            borderRadius: '12px',
            px: 3,
            py: 2.5,
          }}
        >
          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'flex-start' }}>
            <FileText size={20} color="#2563eb" />
            <Box>
              <Typography sx={{ color: '#2563eb', fontWeight: 600 }}>
                Variables disponibles
              </Typography>
              <Typography sx={{ color: '#2563eb', fontSize: 14, mt: 0.6 }}>
                Usa{' '}
                {EMAIL_TEMPLATE_VARIABLES.map((variable) => (
                  <Box
                    key={variable}
                    component="span"
                    sx={{
                      bgcolor: '#dbeafe',
                      borderRadius: '6px',
                      px: 1,
                      py: 0.3,
                      mx: 0.4,
                      fontWeight: 500,
                    }}
                  >
                    {variable}
                  </Box>
                ))}{' '}
                para personalizar tus mensajes
              </Typography>
            </Box>
          </Stack>
        </Box>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {isError && (
          <Typography sx={{ color: '#ef4444', textAlign: 'center' }}>
            Error al cargar las plantillas.
          </Typography>
        )}

        {!isLoading && !isError && templates.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 5,
              textAlign: 'center',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
            }}
          >
            <Typography variant="h2">No hay plantillas creadas</Typography>
            <Typography sx={{ mt: 1, color: '#64748b' }}>
              Creá la primera plantilla para automatizar mensajes del pipeline.
            </Typography>
          </Paper>
        )}

        <Stack spacing={3}>
          {paginatedTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onDelete={handleDelete}
              isDeleting={
                deleteMutation.isPending &&
                deleteMutation.variables === template.id
              }
            />
          ))}
        </Stack>

        {!isLoading && !isError ? (
          <PaginationControls
            page={page}
            pageSize={EMAIL_TEMPLATES_PAGE_SIZE}
            totalItems={templates.length}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        ) : null}
      </Stack>
      <AppSnackbar snackbar={snackbar} onClose={() => setSnackbar(null)} />
    </Container>
  );
}
