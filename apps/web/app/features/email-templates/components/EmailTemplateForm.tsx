'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@tanstack/react-form';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  FormLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FileText, Mail, Send, SquarePen, Tags, X } from 'lucide-react';
import type {
  CreateEmailTemplateDTO,
  EmailTemplate,
  EmailTemplateStage,
  UpdateEmailTemplateDTO,
} from '@ats/shared-types';
import {
  EMAIL_TEMPLATE_STAGE_LABELS,
  EMAIL_TEMPLATE_STAGES,
  EMAIL_TEMPLATE_VARIABLES,
} from '../emailTemplates.service';

interface EmailTemplateFormProps {
  mode: 'create' | 'edit';
  template?: EmailTemplate;
  isLoading?: boolean;
  onSubmit: (
    payload: CreateEmailTemplateDTO | UpdateEmailTemplateDTO,
  ) => Promise<void>;
}

type EmailTemplateFormValues = {
  name: string;
  stage: EmailTemplateStage | '';
  subject: string;
  body: string;
};

const requiredMessage = 'Este campo es obligatorio';

export default function EmailTemplateForm({
  mode,
  template,
  isLoading = false,
  onSubmit,
}: EmailTemplateFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initialValues: EmailTemplateFormValues = {
    name: template?.name ?? '',
    stage: template?.stage ?? '',
    subject: template?.subject ?? '',
    body: template?.body ?? '',
  };
  const [liveValues, setLiveValues] =
    useState<EmailTemplateFormValues>(initialValues);
  const bodyFieldRef = useRef<{
    handleChange: (value: string) => void;
    state: { value: string };
  } | null>(null);

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null);

      if (
        !value.name.trim() ||
        !value.stage ||
        !value.subject.trim() ||
        !value.body.trim()
      ) {
        setSubmitError('Completá todos los campos requeridos.');
        return;
      }

      await onSubmit({
        name: value.name.trim(),
        stage: value.stage,
        subject: value.subject.trim(),
        body: value.body.trim(),
        isDefault: template?.isDefault ?? false,
      });
    },
  });

  const characterCount = liveValues.body.length;

  const title =
    mode === 'create'
      ? 'Nueva Plantilla de Email'
      : 'Editar Plantilla de Email';
  const subtitle =
    mode === 'create'
      ? 'Crea una plantilla para automatizar la comunicación con candidatos'
      : 'Modifica la plantilla de comunicación existente';
  const actionLabel = mode === 'create' ? 'Crear Plantilla' : 'Guardar Cambios';

  const canSubmit = useMemo(() => {
    return (
      liveValues.name.trim().length > 0 &&
      Boolean(liveValues.stage) &&
      liveValues.subject.trim().length > 0 &&
      liveValues.body.trim().length > 0
    );
  }, [liveValues]);

  function insertVariable(variable: string) {
    const field = bodyFieldRef.current;
    if (!field) return;
    const current = field.state.value;
    const separator = current.length > 0 && !current.endsWith(' ') ? ' ' : '';
    const nextBody = `${current}${separator}${variable}`;
    field.handleChange(nextBody);
    setLiveValues((currentValues) => ({ ...currentValues, body: nextBody }));
  }

  return (
    <Box sx={{ minHeight: '100%', bgcolor: '#f8fafc', px: 2, py: 5 }}>
      <Stack sx={{ alignItems: 'center', mb: 5 }} spacing={1.5}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: '#2563eb',
            display: 'grid',
            placeItems: 'center',
            color: '#ffffff',
          }}
        >
          <Mail size={34} />
        </Box>
        <Typography variant="h1" sx={{ textAlign: 'center' }}>
          {title}
        </Typography>
        <Typography sx={{ color: '#475569', textAlign: 'center' }}>
          {subtitle}
        </Typography>
      </Stack>

      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          form.handleSubmit();
        }}
        sx={{ maxWidth: 900, mx: 'auto' }}
      >
        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{
              overflow: 'hidden',
              borderRadius: '16px',
              boxShadow: '0 16px 36px rgba(15, 23, 42, 0.08)',
            }}
          >
            <Box sx={{ bgcolor: '#2563eb', color: '#ffffff', px: 4, py: 3 }}>
              <Typography
                sx={{ color: '#ffffff', fontSize: 24, fontWeight: 500 }}
              >
                Información de la Plantilla
              </Typography>
            </Box>

            <Stack spacing={3} sx={{ p: 4 }}>
              <form.Field name="name">
                {(field) => (
                  <FormControl fullWidth>
                    <FormLabel
                      sx={{ mb: 1, color: '#334155', fontWeight: 500 }}
                    >
                      <Stack
                        direction="row"
                        sx={{ alignItems: 'center', gap: 1 }}
                      >
                        <FileText size={16} />
                        Nombre de la Plantilla
                        <Box component="span" sx={{ color: '#ef4444' }}>
                          *
                        </Box>
                      </Stack>
                    </FormLabel>
                    <TextField
                      placeholder="Ej: Confirmación de Recepción"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        const nextName = event.target.value;
                        field.handleChange(nextName);
                        setLiveValues((currentValues) => ({
                          ...currentValues,
                          name: nextName,
                        }));
                      }}
                      error={
                        field.state.meta.isTouched && !field.state.value.trim()
                      }
                      helperText={
                        field.state.meta.isTouched && !field.state.value.trim()
                          ? requiredMessage
                          : ''
                      }
                      fullWidth
                    />
                  </FormControl>
                )}
              </form.Field>

              <form.Field name="stage">
                {(field) => (
                  <FormControl fullWidth>
                    <FormLabel
                      sx={{ mb: 1, color: '#334155', fontWeight: 500 }}
                    >
                      <Stack
                        direction="row"
                        sx={{ alignItems: 'center', gap: 1 }}
                      >
                        <Send size={16} />
                        Estadio de Postulación
                        <Box component="span" sx={{ color: '#ef4444' }}>
                          *
                        </Box>
                      </Stack>
                    </FormLabel>
                    <Select
                      displayEmpty
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        const nextStage = event.target
                          .value as EmailTemplateStage;
                        field.handleChange(nextStage);
                        setLiveValues((currentValues) => ({
                          ...currentValues,
                          stage: nextStage,
                        }));
                      }}
                      error={field.state.meta.isTouched && !field.state.value}
                    >
                      <MenuItem value="" disabled>
                        Seleccioná un estadio
                      </MenuItem>
                      {EMAIL_TEMPLATE_STAGES.map((stage) => (
                        <MenuItem key={stage} value={stage}>
                          {EMAIL_TEMPLATE_STAGE_LABELS[stage]}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText sx={{ ml: 0, color: '#64748b' }}>
                      Esta plantilla se enviará automáticamente cuando un
                      candidato alcance este estadio
                    </FormHelperText>
                  </FormControl>
                )}
              </form.Field>

              <form.Field name="subject">
                {(field) => (
                  <FormControl fullWidth>
                    <FormLabel
                      sx={{ mb: 1, color: '#334155', fontWeight: 500 }}
                    >
                      <Stack
                        direction="row"
                        sx={{ alignItems: 'center', gap: 1 }}
                      >
                        <Mail size={16} />
                        Asunto del Email
                        <Box component="span" sx={{ color: '#ef4444' }}>
                          *
                        </Box>
                      </Stack>
                    </FormLabel>
                    <TextField
                      placeholder="Ej: Hemos recibido tu postulación - [Nombre de la Posición]"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        const nextSubject = event.target.value;
                        field.handleChange(nextSubject);
                        setLiveValues((currentValues) => ({
                          ...currentValues,
                          subject: nextSubject,
                        }));
                      }}
                      error={
                        field.state.meta.isTouched && !field.state.value.trim()
                      }
                      helperText={
                        field.state.meta.isTouched && !field.state.value.trim()
                          ? requiredMessage
                          : ''
                      }
                      fullWidth
                    />
                  </FormControl>
                )}
              </form.Field>

              <Box
                sx={{
                  border: '1px solid #bfdbfe',
                  bgcolor: '#eff6ff',
                  borderRadius: '12px',
                  p: 3,
                }}
              >
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    sx={{ alignItems: 'center', gap: 1.5 }}
                  >
                    <Tags size={18} color="#2563eb" />
                    <Box>
                      <Typography sx={{ color: '#004eea', fontWeight: 500 }}>
                        Variables disponibles
                      </Typography>
                      <Typography sx={{ color: '#004eea', fontSize: 14 }}>
                        Haz clic en las etiquetas para insertarlas en el mensaje
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
                    {EMAIL_TEMPLATE_VARIABLES.map((variable) => (
                      <Button
                        key={variable}
                        type="button"
                        onClick={() => insertVariable(variable)}
                        sx={{
                          bgcolor: '#dbeafe',
                          color: '#004eea',
                          px: 2,
                          '&:hover': { bgcolor: '#bfdbfe' },
                        }}
                      >
                        {variable}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              </Box>

              <form.Field name="body">
                {(field) => {
                  bodyFieldRef.current = field;
                  return (
                    <FormControl fullWidth>
                      <FormLabel
                        sx={{ mb: 1, color: '#334155', fontWeight: 500 }}
                      >
                        <Stack
                          direction="row"
                          sx={{ alignItems: 'center', gap: 1 }}
                        >
                          <FileText size={16} />
                          Cuerpo del Mensaje
                          <Box component="span" sx={{ color: '#ef4444' }}>
                            *
                          </Box>
                        </Stack>
                      </FormLabel>
                      <TextField
                        multiline
                        minRows={10}
                        placeholder={
                          'Escribe el contenido del email aquí...\n\nPuedes usar [Nombre del Candidato] y [Nombre de la Posición] para personalizar el mensaje.'
                        }
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => {
                          const nextBody = event.target.value;
                          field.handleChange(nextBody);
                          setLiveValues((currentValues) => ({
                            ...currentValues,
                            body: nextBody,
                          }));
                        }}
                        error={
                          field.state.meta.isTouched &&
                          !field.state.value.trim()
                        }
                        helperText={
                          field.state.meta.isTouched &&
                          !field.state.value.trim()
                            ? requiredMessage
                            : ''
                        }
                        fullWidth
                      />
                      <FormHelperText sx={{ ml: 0, color: '#64748b' }}>
                        {characterCount} caracteres
                      </FormHelperText>
                    </FormControl>
                  );
                }}
              </form.Field>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              overflow: 'hidden',
              borderRadius: '16px',
              boxShadow: '0 16px 36px rgba(15, 23, 42, 0.08)',
            }}
          >
            <Box sx={{ bgcolor: '#334155', color: '#ffffff', px: 4, py: 2.5 }}>
              <Typography
                sx={{ color: '#ffffff', fontSize: 24, fontWeight: 500 }}
              >
                Vista Previa
              </Typography>
            </Box>
            <Stack spacing={2.5} sx={{ p: 4, minHeight: 290 }}>
              <Box>
                <Typography sx={{ color: '#64748b', fontSize: 13 }}>
                  De:
                </Typography>
                <Typography sx={{ color: '#0f172a' }}>
                  Equipo de Recursos Humanos
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: '#64748b', fontSize: 13 }}>
                  Asunto:
                </Typography>
                <Typography sx={{ color: '#0f172a' }}>
                  {liveValues.subject || 'Asunto del email'}
                </Typography>
              </Box>
              <Box sx={{ borderTop: '1px solid #e2e8f0', pt: 2 }}>
                <Typography sx={{ color: '#334155', lineHeight: 1.6 }}>
                  {liveValues.body ||
                    'El contenido del mensaje aparecerá aquí.'}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {submitError && (
            <Typography sx={{ color: '#ef4444', textAlign: 'center' }}>
              {submitError}
            </Typography>
          )}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ pb: 2 }}
          >
            <Button
              type="button"
              variant="outlined"
              startIcon={<X size={18} />}
              onClick={() => router.push('/dashboard/communication-templates')}
              disabled={isLoading}
              fullWidth
              sx={{
                py: 1.4,
                color: '#334155',
                borderColor: '#e2e8f0',
                bgcolor: '#ffffff',
                '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={
                isLoading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : mode === 'create' ? (
                  <Send size={18} />
                ) : (
                  <SquarePen size={18} />
                )
              }
              disabled={isLoading || !canSubmit}
              fullWidth
              sx={{
                py: 1.4,
                bgcolor: '#2563eb',
                boxShadow: '0 14px 24px rgba(37,99,235,0.28)',
                '&:hover': { bgcolor: '#1d4ed8' },
              }}
            >
              {actionLabel}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
