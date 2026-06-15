'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  FormLabel,
  Paper,
  Select,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  BriefcaseBusiness,
  Building2,
  Calendar,
  ChevronLeft,
  FileText,
  GraduationCap,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import {
  SENIORITY_OPTIONS,
  type Job,
  type JobLocation,
  type JobStatus,
  type ListPositionsResponse,
  type Skill,
  type UpdateJobDTO,
  type UpdatePositionPayload,
} from '@ats/shared-types';
import {
  updatePosition,
  updatePositionStatus,
} from '@/shared/api/positionsApi';
import { getJobStatusStyle } from '@/shared/lib/jobStatus';
import AppSnackbar, {
  type AppSnackbarState,
} from '@/shared/components/AppSnackbar';

type EditableSkill = Skill;

type SkillDraft = {
  name: string;
  weight: string;
};

type Props = {
  job: Job;
  onSave?: (jobId: string, payload: UpdateJobDTO) => Promise<void>;
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    bgcolor: '#f8fafc',
    minHeight: 44,
  },
  '& .MuiOutlinedInput-input': {
    fontSize: '0.86rem',
  },
};

function formatDate(date?: Date | string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatLines(value?: string[]): string {
  return value?.join('\n') ?? '';
}

function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeFormValue(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}

function serializeSkills(skills: EditableSkill[]): string {
  return JSON.stringify(
    skills.map(({ name, weight, type }) => ({
      name,
      weight,
      type,
    })),
  );
}

function InfoMetric({
  icon,
  label,
  value,
  tone = 'blue',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'blue' | 'green' | 'slate';
}) {
  const tones = {
    blue: { color: '#2563eb', bg: '#dbeafe' },
    green: { color: '#16a34a', bg: '#dbfce7' },
    slate: { color: '#334155', bg: '#f1f5f9' },
  };

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: 'center', marginTop: '20px' }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: '10px',
          bgcolor: tones[tone].bg,
          color: tones[tone].color,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          sx={{
            color: '#64748b',
            fontSize: '0.72rem',
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            color: '#0f172a',
            fontSize: '0.87rem',
            fontWeight: 700,
            mt: 0.2,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

function Section({
  title,
  icon,
  badge,
  headerColor = '#2563eb',
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  badge?: string;
  headerColor?: string;
  children: React.ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        overflow: 'hidden',
        borderRadius: '14px',
        boxShadow: '0 16px 35px rgba(15, 23, 42, 0.12)',
        border: '1px solid #e2e8f0',
      }}
    >
      <Box
        sx={{
          bgcolor: headerColor,
          color: '#ffffff',
          px: 3,
          py: 2.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 64,
        }}
      >
        <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
          {icon}
          <Typography
            sx={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}
          >
            {title}
          </Typography>
        </Stack>
        {badge ? (
          <Chip
            label={badge}
            size="small"
            sx={{
              bgcolor: 'rgba(255,255,255,0.18)',
              color: '#ffffff',
              fontSize: '0.72rem',
              height: 30,
              fontWeight: 600,
            }}
          />
        ) : null}
      </Box>
      <Box sx={{ p: 3, bgcolor: '#ffffff' }}>{children}</Box>
    </Paper>
  );
}

function FieldLabel({
  icon,
  children,
  required,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <FormLabel
      sx={{
        mb: 1,
        color: '#475569',
        fontWeight: 700,
        fontSize: '0.78rem',
        display: 'flex',
        alignItems: 'center',
        gap: 0.8,
      }}
    >
      {icon}
      {children}
      {required ? (
        <Box component="span" sx={{ color: '#ef4444' }}>
          *
        </Box>
      ) : null}
    </FormLabel>
  );
}

function SkillEditor({
  note,
  skills,
  draft,
  setDraft,
  addSkill,
  updateSkill,
  removeSkill,
  noteTone = 'blue',
}: {
  note: React.ReactNode;
  skills: EditableSkill[];
  draft: SkillDraft;
  setDraft: (draft: SkillDraft) => void;
  addSkill: () => void;
  updateSkill: (index: number, draft: SkillDraft) => void;
  removeSkill: (index: number) => void;
  noteTone?: 'blue' | 'slate';
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function handleSaveSkill() {
    if (editingIndex === null) {
      addSkill();
      return;
    }

    updateSkill(editingIndex, draft);
    setEditingIndex(null);
  }

  function startEditingSkill(skill: EditableSkill, index: number) {
    setDraft({
      name: skill.name,
      weight: String(skill.weight),
    });
    setEditingIndex(index);
  }

  function cancelEditingSkill() {
    setDraft({ name: '', weight: '' });
    setEditingIndex(null);
  }

  return (
    <Stack spacing={2.2}>
      <Alert
        icon={false}
        sx={{
          bgcolor: noteTone === 'blue' ? '#eff6ff' : '#f8fafc',
          border: '1px solid #dbeafe',
          borderRadius: '8px',
          color: noteTone === 'blue' ? '#2563eb' : '#334155',
          fontSize: '0.76rem',
          fontWeight: 500,
          py: 1.1,
        }}
      >
        {note}
      </Alert>

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: '10px',
          borderColor: '#dbe2ea',
          bgcolor: '#f8fafc',
        }}
      >
        <Grid container spacing={1.6} sx={{ alignItems: 'end' }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography
              sx={{
                fontSize: '0.72rem',
                color: '#64748b',
                fontWeight: 700,
                mb: 0.7,
              }}
            >
              Nombre de la Skill
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Ej: React, TypeScript, Node.js..."
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              sx={inputSx}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <Typography
              sx={{
                fontSize: '0.72rem',
                color: '#64748b',
                fontWeight: 700,
                mb: 0.7,
              }}
            >
              Peso (1-10)
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              slotProps={{ htmlInput: { min: 1, max: 10 } }}
              value={draft.weight}
              onChange={(event) =>
                setDraft({ ...draft, weight: event.target.value })
              }
              sx={inputSx}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={handleSaveSkill}
              sx={{ height: 44, px: { xs: 2, md: 1.2 } }}
            >
              {editingIndex === null ? 'Agregar' : 'Actualizar'}
            </Button>
            {editingIndex !== null ? (
              <Button
                fullWidth
                variant="outlined"
                onClick={cancelEditingSkill}
                sx={{ mt: 1, height: 36, px: { xs: 2, md: 1.2 } }}
              >
                Cancelar
              </Button>
            ) : null}
          </Grid>
        </Grid>
      </Paper>

      <Box>
        <Typography
          sx={{
            color: '#334155',
            fontSize: '0.86rem',
            fontWeight: 700,
            mb: 1.5,
          }}
        >
          Skills Agregadas ({skills.length})
        </Typography>
        <Stack spacing={1}>
          {skills.map((skill, index) => (
            <Box
              key={`${skill.name}-${index}`}
              sx={{
                minHeight: 54,
                border: '1px solid #dbe2ea',
                bgcolor: '#f8fafc',
                borderRadius: '8px',
                px: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Stack
                direction="row"
                spacing={1.2}
                sx={{ alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}
              >
                <Typography
                  sx={{
                    color: '#334155',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                  }}
                >
                  {skill.name}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                <Button
                  aria-label={`Editar ${skill.name}`}
                  onClick={() => startEditingSkill(skill, index)}
                  sx={{
                    minWidth: 34,
                    color: '#2563eb',
                    p: 0.5,
                    '&:hover': { bgcolor: '#dbeafe' },
                  }}
                >
                  <Pencil size={16} />
                </Button>
                <Button
                  aria-label={`Quitar ${skill.name}`}
                  onClick={() => {
                    removeSkill(index);
                    if (editingIndex === index) {
                      cancelEditingSkill();
                    }
                  }}
                  sx={{
                    minWidth: 34,
                    color: '#ef4444',
                    p: 0.5,
                    '&:hover': { bgcolor: '#fee2e2' },
                  }}
                >
                  <X size={16} />
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

export default function PositionEditView({ job, onSave }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [snackbar, setSnackbar] = useState<AppSnackbarState>(null);
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const statusStyle = getJobStatusStyle(status);
  const [mandatorySkills, setMandatorySkills] = useState<EditableSkill[]>(() =>
    job.skills.filter((skill) => skill.type === 'mandatory'),
  );
  const [desirableSkills, setDesirableSkills] = useState<EditableSkill[]>(() =>
    job.skills.filter((skill) => skill.type === 'desirable'),
  );
  const [mandatoryDraft, setMandatoryDraft] = useState<SkillDraft>({
    name: '',
    weight: '',
  });
  const [desirableDraft, setDesirableDraft] = useState<SkillDraft>({
    name: '',
    weight: '',
  });
  const defaultFormValues = {
    title: job.title,
    department: job.department,
    seniority: job.seniority,
    location: job.location,
    city: job.city ?? '',
    type: job.type ?? '',
    description: job.description,
    requirements: formatLines(job.requirements),
    responsabilities: formatLines(job.responsabilities),
    benefits: formatLines(job.benefits),
    observations: job.observations ?? '',
    additionalCriteria: formatLines(job.additionalCriteria),
  };
  const defaultFormValueKey = serializeFormValue(defaultFormValues);
  const defaultSkillsKey = serializeSkills([
    ...job.skills.filter((skill) => skill.type === 'mandatory'),
    ...job.skills.filter((skill) => skill.type === 'desirable'),
  ]);
  const currentSkillsKey = serializeSkills([
    ...mandatorySkills,
    ...desirableSkills,
  ]);

  useEffect(() => {
    setStatus(job.status);
  }, [job.status]);

  async function handleStatusChange(nextStatus: JobStatus) {
    if (nextStatus === status || isUpdatingStatus) return;

    const previousStatus = status;
    setStatus(nextStatus);
    setIsUpdatingStatus(true);

    try {
      await updatePositionStatus({
        id: job.id,
        status: nextStatus,
      });
      queryClient.setQueriesData<ListPositionsResponse>(
        { queryKey: ['positions'] },
        (current) =>
          current
            ? {
                ...current,
                jobs: current.jobs.map((position) =>
                  position.id === job.id
                    ? { ...position, status: nextStatus }
                    : position,
                ),
              }
            : current,
      );
      await queryClient.invalidateQueries({ queryKey: ['positions'] });
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setSnackbar({
        message: 'Estado actualizado correctamente',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error updating position status:', error);
      setStatus(previousStatus);
      setSnackbar({
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar el estado',
        severity: 'error',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  const form = useForm({
    defaultValues: defaultFormValues,
    onSubmit: async ({ value }) => {
      const requirements = parseLines(value.requirements);
      const additionalCriteria = parseLines(value.additionalCriteria);
      const payload: UpdateJobDTO = {
        title: value.title,
        department: value.department,
        seniority: value.seniority,
        location: value.location as JobLocation,
        city: value.city.trim() || undefined,
        type: value.type.trim() || undefined,
        description: value.description,
        responsabilities: parseLines(value.responsabilities),
        benefits: parseLines(value.benefits),
        observations: value.observations.trim() || undefined,
        ...(requirements.length > 0 && { requirements }),
        ...(additionalCriteria.length > 0 && { additionalCriteria }),
        skills: [...mandatorySkills, ...desirableSkills],
      };

      try {
        if (onSave) {
          await onSave(job.id, payload);
        } else {
          await updatePosition({
            id: job.id,
            ...payload,
          } as UpdatePositionPayload);
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['positions'] }),
          queryClient.invalidateQueries({ queryKey: ['departments'] }),
          queryClient.invalidateQueries({ queryKey: ['jobs'] }),
        ]);
        setSnackbar({
          message: 'Cambios guardados correctamente',
          severity: 'success',
        });
        setTimeout(() => {
          router.push('/dashboard/positions');
        }, 900);
      } catch (error) {
        setSnackbar({
          message:
            error instanceof Error
              ? error.message
              : 'No se pudieron guardar los cambios',
          severity: 'error',
        });
      }
    },
  });

  const addSkillFromDraft = (
    draft: SkillDraft,
    type: Skill['type'],
    update: React.Dispatch<React.SetStateAction<EditableSkill[]>>,
    reset: (draft: SkillDraft) => void,
  ) => {
    if (!draft.name.trim()) return;
    if (!draft.weight.trim()) return;
    update((current) => [
      ...current,
      {
        name: draft.name.trim(),
        weight: Math.min(10, Math.max(1, Number(draft.weight) || 1)),
        type,
      },
    ]);
    reset({ name: '', weight: '' });
  };

  const updateSkillFromDraft = (
    index: number,
    draft: SkillDraft,
    type: Skill['type'],
    update: React.Dispatch<React.SetStateAction<EditableSkill[]>>,
    reset: (draft: SkillDraft) => void,
  ) => {
    if (!draft.name.trim()) return;
    if (!draft.weight.trim()) return;

    update((current) =>
      current.map((skill, itemIndex) =>
        itemIndex === index
          ? {
              name: draft.name.trim(),
              weight: Math.min(10, Math.max(1, Number(draft.weight) || 1)),
              type,
            }
          : skill,
      ),
    );
    reset({ name: '', weight: '' });
  };

  return (
    <Box
      sx={{
        bgcolor: '#f3f8ff',
        minHeight: '100vh',
        py: 5,
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', pb: 5 }}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            pt: 0,
            mb: 2.5,
          }}
        >
          <Button
            startIcon={<ChevronLeft size={17} />}
            onClick={() => router.push('/dashboard/positions')}
            sx={{
              bgcolor: '#ffffff',
              border: '1px solid #dbe2ea',
              borderRadius: '8px',
              color: '#475569',
              px: 2.2,
              height: 44,
              fontSize: '0.84rem',
              fontWeight: 700,
              boxShadow: '0 1px 4px rgba(15, 23, 42, 0.08)',
              '&:hover': { bgcolor: '#f8fafc' },
            }}
          >
            Volver al Listado
          </Button>
          <Select
            size="small"
            value={status}
            disabled={isUpdatingStatus}
            onChange={(event) =>
              void handleStatusChange(event.target.value as JobStatus)
            }
            MenuProps={{ disableScrollLock: true }}
            renderValue={() => statusStyle.label}
            sx={{
              bgcolor: statusStyle.backgroundColor,
              border: `1px solid ${statusStyle.borderColor}`,
              color: statusStyle.color,
              fontWeight: 700,
              height: 34,
              minWidth: 118,
              borderRadius: '999px',
              fontSize: '0.82rem',
              '& .MuiSelect-select': {
                py: 0.5,
                pl: 2,
                pr: '34px !important',
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                border: 0,
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: 0,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: 0,
              },
              '& .MuiSvgIcon-root': {
                color: statusStyle.color,
                right: 10,
              },
            }}
          >
            {(['draft', 'open', 'paused', 'closed'] as JobStatus[]).map(
              (option) => {
                const optionStyle = getJobStatusStyle(option);
                return (
                  <MenuItem key={option} value={option}>
                    <Box
                      component="span"
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: optionStyle.backgroundColor,
                        border: `1px solid ${optionStyle.borderColor}`,
                        mr: 1,
                      }}
                    />
                    {optionStyle.label}
                  </MenuItem>
                );
              },
            )}
          </Select>
        </Stack>

        <Stack sx={{ alignItems: 'center', mb: 3.2 }}>
          <Box
            sx={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              bgcolor: '#2563eb',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              mb: 2,
              boxShadow: '0 12px 24px rgba(37, 99, 235, 0.22)',
            }}
          >
            <BriefcaseBusiness size={29} />
          </Box>
          <Typography
            sx={{ color: '#0f172a', fontSize: '1.55rem', fontWeight: 700 }}
          >
            Editar Job Description
          </Typography>
          <Typography sx={{ color: '#64748b', mt: 1, fontSize: '0.95rem' }}>
            Modifica los criterios de evaluación para el matching de candidatos
          </Typography>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            maxWidth: 980,
            mx: 'auto',
            p: { xs: 2, md: 2.3 },
            borderRadius: '14px',
            bgcolor: '#ffffff',
            boxShadow: '0 16px 35px rgba(15, 23, 42, 0.18)',
            mb: 3,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            <InfoMetric
              icon={<Calendar size={20} />}
              label="Fecha de Creación"
              value={formatDate(job.createdAt)}
            />
            <InfoMetric
              icon={<Users size={20} />}
              label="Candidatos Asociados"
              value={`${job.candidates ?? 0} candidatos`}
              tone="green"
            />
            <InfoMetric
              icon={<FileText size={20} />}
              label="Última Modificación"
              value={formatDate(job.updatedAt)}
              tone="slate"
            />
          </Box>
        </Paper>

        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
          sx={{ maxWidth: 980, mx: 'auto' }}
        >
          <Stack spacing={3}>
            <Alert
              icon={<Sparkles size={17} />}
              sx={{
                bgcolor: '#eff6ff',
                border: '1px solid #dbeafe',
                borderRadius: '12px',
                color: '#2563eb',
                alignItems: 'flex-start',
                py: 1.9,
                '& .MuiAlert-icon': { color: '#2563eb', mt: 0.2 },
              }}
            >
              <Typography
                sx={{ fontWeight: 700, fontSize: '0.86rem', color: '#2563eb' }}
              >
                Matching Automático por Skills
              </Typography>
              <Typography
                sx={{ fontSize: '0.78rem', color: '#2563eb', mt: 0.4 }}
              >
                Los cambios que realices actualizarán automáticamente el scoring
                de los {job.candidates ?? 0} candidatos asociados a esta
                posición.
              </Typography>
            </Alert>

            <Section title="Información General">
              <Stack spacing={2.4}>
                <form.Field name="title">
                  {(field) => (
                    <FormControl fullWidth>
                      <FieldLabel
                        icon={<BriefcaseBusiness size={14} />}
                        required
                      >
                        Título de la Posición
                      </FieldLabel>
                      <TextField
                        fullWidth
                        size="small"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        sx={inputSx}
                      />
                    </FormControl>
                  )}
                </form.Field>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <form.Field name="department">
                      {(field) => (
                        <FormControl fullWidth>
                          <FieldLabel icon={<Building2 size={14} />} required>
                            Área
                          </FieldLabel>
                          <TextField
                            fullWidth
                            size="small"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            sx={inputSx}
                          />
                        </FormControl>
                      )}
                    </form.Field>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <form.Field name="seniority">
                      {(field) => (
                        <FormControl fullWidth>
                          <FieldLabel
                            icon={<GraduationCap size={14} />}
                            required
                          >
                            Seniority Buscado
                          </FieldLabel>
                          <Select
                            fullWidth
                            size="small"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            sx={{
                              borderRadius: '8px',
                              bgcolor: '#f8fafc',
                              minHeight: 44,
                            }}
                          >
                            <MenuItem value="" disabled>
                              Seleccionar
                            </MenuItem>
                            {SENIORITY_OPTIONS.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </form.Field>
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <form.Field name="location">
                      {(field) => (
                        <FormControl fullWidth>
                          <FieldLabel required>Ubicacion</FieldLabel>
                          <Select
                            fullWidth
                            size="small"
                            value={field.state.value}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            sx={{
                              borderRadius: '8px',
                              bgcolor: '#f8fafc',
                              minHeight: 44,
                            }}
                          >
                            <MenuItem value="remote">Remoto</MenuItem>
                            <MenuItem value="hybrid">Hibrido</MenuItem>
                            <MenuItem value="on-site">Presencial</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    </form.Field>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <form.Field name="city">
                      {(field) => (
                        <FormControl fullWidth>
                          <FieldLabel>Ciudad</FieldLabel>
                          <TextField
                            fullWidth
                            size="small"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            sx={inputSx}
                          />
                        </FormControl>
                      )}
                    </form.Field>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <form.Field name="type">
                      {(field) => (
                        <FormControl fullWidth>
                          <FieldLabel>Tipo de Contratacion</FieldLabel>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Ej: Full-time, Part-time, Contractor"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            sx={inputSx}
                          />
                        </FormControl>
                      )}
                    </form.Field>
                  </Grid>
                </Grid>

                <form.Field name="description">
                  {(field) => (
                    <FormControl fullWidth>
                      <FieldLabel icon={<FileText size={14} />} required>
                        Descripción General
                      </FieldLabel>
                      <TextField
                        fullWidth
                        multiline
                        minRows={5}
                        placeholder="Describe el rol, responsabilidades principales y contexto del equipo..."
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        sx={inputSx}
                      />
                    </FormControl>
                  )}
                </form.Field>

                <form.Field name="requirements">
                  {(field) => (
                    <FormControl fullWidth>
                      <FieldLabel>Requisitos</FieldLabel>
                      <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        placeholder="Escribi un requisito por linea"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        sx={inputSx}
                      />
                    </FormControl>
                  )}
                </form.Field>

                <form.Field name="responsabilities">
                  {(field) => (
                    <FormControl fullWidth>
                      <FieldLabel required>Responsabilidades</FieldLabel>
                      <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        placeholder="Escribi una responsabilidad por linea"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        sx={inputSx}
                      />
                    </FormControl>
                  )}
                </form.Field>

                <form.Field name="benefits">
                  {(field) => (
                    <FormControl fullWidth>
                      <FieldLabel required>Beneficios</FieldLabel>
                      <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        placeholder="Escribi un beneficio por linea"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        sx={inputSx}
                      />
                    </FormControl>
                  )}
                </form.Field>
              </Stack>
            </Section>

            <Section
              title="Hard Skills Obligatorias"
              icon={<Star size={18} />}
              badge="Requerido"
            >
              <SkillEditor
                note={
                  <>
                    <strong>Peso:</strong> Define la importancia de cada skill
                    en el matching (1-10). Mayor peso = mayor impacto en el
                    ranking del candidato.
                  </>
                }
                skills={mandatorySkills}
                draft={mandatoryDraft}
                setDraft={setMandatoryDraft}
                addSkill={() =>
                  addSkillFromDraft(
                    mandatoryDraft,
                    'mandatory',
                    setMandatorySkills,
                    setMandatoryDraft,
                  )
                }
                updateSkill={(index, draft) =>
                  updateSkillFromDraft(
                    index,
                    draft,
                    'mandatory',
                    setMandatorySkills,
                    setMandatoryDraft,
                  )
                }
                removeSkill={(index) =>
                  setMandatorySkills((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              />
            </Section>

            <Section
              title="Hard Skills Deseables"
              icon={<Star size={18} />}
              badge="Opcional"
              headerColor="#334155"
            >
              <SkillEditor
                note={
                  <>
                    <strong>Nice to have:</strong> Skills que suman puntos
                    adicionales pero no son excluyentes para la selección del
                    candidato.
                  </>
                }
                skills={desirableSkills}
                draft={desirableDraft}
                setDraft={setDesirableDraft}
                addSkill={() =>
                  addSkillFromDraft(
                    desirableDraft,
                    'desirable',
                    setDesirableSkills,
                    setDesirableDraft,
                  )
                }
                updateSkill={(index, draft) =>
                  updateSkillFromDraft(
                    index,
                    draft,
                    'desirable',
                    setDesirableSkills,
                    setDesirableDraft,
                  )
                }
                removeSkill={(index) =>
                  setDesirableSkills((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                noteTone="slate"
              />
            </Section>

            <Section
              title="Observaciones y Criterios Adicionales"
              icon={<FileText size={18} />}
            >
              <Stack spacing={2.2}>
                <Alert
                  icon={false}
                  sx={{
                    bgcolor: '#eff6ff',
                    border: '1px solid #dbeafe',
                    borderRadius: '8px',
                    color: '#2563eb',
                    fontSize: '0.76rem',
                    fontWeight: 500,
                  }}
                >
                  <strong>Ejemplos:</strong> &quot;Se acepta candidato junior si
                  tiene experiencia en React y TypeScript&quot;,
                  &quot;Preferible experiencia en startups&quot;,
                  &quot;Disponibilidad para viajar ocasionalmente&quot;
                </Alert>
                <form.Field name="observations">
                  {(field) => (
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="Observaciones"
                      placeholder="Agrega consideraciones importantes para la evaluacion..."
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      sx={inputSx}
                    />
                  )}
                </form.Field>

                <form.Field name="additionalCriteria">
                  {(field) => (
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="Criterios adicionales"
                      placeholder="Escribi un criterio por linea"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      sx={inputSx}
                    />
                  )}
                </form.Field>
              </Stack>
            </Section>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{
                pt: 1.8,
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="outlined"
                  onClick={() => router.push('/dashboard/positions')}
                  sx={{
                    borderColor: '#dbe2ea',
                    color: '#475569',
                    bgcolor: '#ffffff',
                    height: 44,
                    px: 3,
                  }}
                >
                  Cancelar
                </Button>
                <form.Subscribe
                  selector={(state) => ({
                    values: state.values,
                    isSubmitting: state.isSubmitting,
                  })}
                >
                  {({ values, isSubmitting }) => {
                    const hasChanges =
                      serializeFormValue(values) !== defaultFormValueKey ||
                      currentSkillsKey !== defaultSkillsKey;

                    return (
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<Save size={16} />}
                        disabled={!hasChanges || Boolean(isSubmitting)}
                        sx={{
                          height: 44,
                          px: 3.6,
                          boxShadow: hasChanges
                            ? '0 12px 22px rgba(37, 99, 235, 0.28)'
                            : 'none',
                        }}
                      >
                        {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                      </Button>
                    );
                  }}
                </form.Subscribe>
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Container>

      <AppSnackbar
        snackbar={snackbar}
        onClose={() => setSnackbar(null)}
        autoHideDuration={2200}
      />
    </Box>
  );
}
