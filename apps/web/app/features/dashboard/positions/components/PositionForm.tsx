'use client';

import { useForm } from '@tanstack/react-form';

import {
  Box,
  Stack,
  TextField,
  Button,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  FormLabel,
  Chip,
  Alert,
} from '@mui/material';

import Grid from '@mui/material/Grid';

import { Plus, Sparkles, Star, FileText, CircleAlert, X } from 'lucide-react';

import { useState } from 'react';

import {
  SENIORITY_OPTIONS,
  type CreateJobPayload,
  type JobLocation,
  type JobStatus,
  type Skill,
} from '@ats/shared-types';

interface PositionFormProps {
  onSubmit: (data: CreateJobPayload) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
  submitError?: string;
}

function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PositionForm({
  onSubmit,
  isLoading = false,
  onCancel,
  submitError = '',
}: PositionFormProps) {
  const [mandatorySkills, setMandatorySkills] = useState<Skill[]>([]);
  const [desirableSkills, setDesirableSkills] = useState<Skill[]>([]);
  const [validationTrigger, setValidationTrigger] = useState(0);
  const [formError, setFormError] = useState('');

  const [mandatorySkillForm, setMandatorySkillForm] = useState({
    name: '',
    weight: '',
  });

  const [desirableSkillForm, setDesirableSkillForm] = useState({
    name: '',
    weight: '',
  });

  const form = useForm({
    defaultValues: {
      title: '',
      department: '',
      seniority: '',
      location: 'remote',
      city: '',
      type: '',
      description: '',
      requirements: '',
      observations: '',
      additionalCriteria: '',
      status: 'draft',
      responsabilities: '',
      benefits: '',
    },

    onSubmit: async ({ value }) => {
      const validationError = validateForm();
      if (validationError) {
        setFormError(validationError);
        return;
      }

      const payload: CreateJobPayload = {
        title: value.title.trim(),
        department: value.department.trim(),
        seniority: value.seniority.trim(),
        location: value.location as JobLocation,
        city: value.city.trim() || undefined,
        type: value.type.trim() || undefined,
        description: value.description.trim(),
        skills: [...mandatorySkills, ...desirableSkills],
        responsabilities: parseLines(value.responsabilities),
        benefits: parseLines(value.benefits),
        ...(value.observations.trim() && {
          observations: value.observations.trim(),
        }),
        ...(parseLines(value.additionalCriteria).length > 0 && {
          additionalCriteria: parseLines(value.additionalCriteria),
        }),
        ...(parseLines(value.requirements).length > 0 && {
          requirements: parseLines(value.requirements),
        }),
        status: value.status as JobStatus,
      };

      setFormError('');
      await onSubmit(payload);
    },
  });

  const addMandatorySkill = () => {
    if (!mandatorySkillForm.name.trim()) return;
    if (!mandatorySkillForm.weight) return;

    setMandatorySkills([
      ...mandatorySkills,
      {
        name: mandatorySkillForm.name,
        weight: parseInt(mandatorySkillForm.weight),
        type: 'mandatory',
      },
    ]);

    setMandatorySkillForm({
      name: '',
      weight: '',
    });

    setValidationTrigger((prev) => prev + 1);
  };

  const addDesirableSkill = () => {
    if (!desirableSkillForm.name.trim()) return;
    if (!desirableSkillForm.weight) return;

    setDesirableSkills([
      ...desirableSkills,
      {
        name: desirableSkillForm.name,
        weight: parseInt(desirableSkillForm.weight),
        type: 'desirable',
      },
    ]);

    setDesirableSkillForm({
      name: '',
      weight: '',
    });

    setValidationTrigger((prev) => prev + 1);
  };

  const removeMandatorySkill = (index: number) => {
    setMandatorySkills(mandatorySkills.filter((_, i) => i !== index));
    setValidationTrigger((prev) => prev + 1);
  };

  const removeDesirableSkill = (index: number) => {
    setDesirableSkills(desirableSkills.filter((_, i) => i !== index));
    setValidationTrigger((prev) => prev + 1);
  };

  const validateForm = (): string | null => {
    const title = form.state.values.title || '';
    const department = form.state.values.department || '';
    const seniority = form.state.values.seniority || '';
    const description = form.state.values.description || '';
    const responsabilities = parseLines(form.state.values.responsabilities);
    const benefits = parseLines(form.state.values.benefits);

    if (!title.trim()) return 'El título de la posición es obligatorio';
    if (!department.trim()) return 'El área es obligatoria';
    if (!seniority.trim()) return 'El nivel de seniority es obligatorio';
    if (!description.trim()) return 'La descripción general es obligatoria';
    if (responsabilities.length === 0)
      return 'Debe agregar al menos una responsabilidad';
    if (benefits.length === 0) return 'Debe agregar al menos un beneficio';
    if (mandatorySkills.length === 0)
      return 'Debe agregar al menos una skill obligatoria';

    return null;
  };

  const isFormValid = (): boolean => {
    const title = (form.state.values.title || '').trim();
    const department = (form.state.values.department || '').trim();
    const seniority = (form.state.values.seniority || '').trim();
    const description = (form.state.values.description || '').trim();
    const responsabilities = parseLines(form.state.values.responsabilities);
    const benefits = parseLines(form.state.values.benefits);

    return (
      title.length > 0 &&
      department.length > 0 &&
      seniority.length > 0 &&
      description.length > 0 &&
      responsabilities.length > 0 &&
      benefits.length > 0 &&
      mandatorySkills.length > 0
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <Stack spacing={3}>
        {formError ? <Alert severity="error">{formError}</Alert> : null}

        {/* Resumen del cálculo automático de matching */}
        <Alert
          icon={<Sparkles size={16} />}
          sx={{
            borderRadius: '12px',
            bgcolor: '#edf4ff',
            border: '1px solid #dbeafe',
            color: '#2563eb',
            alignItems: 'flex-start',
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
            Matching Automático por Skills
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', mt: 0.5 }}>
            Las skills y sus pesos se utilizarán para calcular un FIT%
            determinístico y ordenar candidatos compatibles.
          </Typography>
        </Alert>

        {/* INFORMACIÓN GENERAL */}
        <Paper
          elevation={0}
          sx={{
            overflow: 'hidden',
            borderRadius: '14px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
          }}
        >
          <Box
            sx={{
              bgcolor: '#2563eb',
              color: '#ffffff',
              px: 3,
              py: 2,
              fontWeight: 600,
              fontSize: '0.95rem',
            }}
          >
            Información General
          </Box>

          <Box sx={{ p: 3, bgcolor: '#ffffff' }}>
            <Stack spacing={3}>
              <form.Field name="title">
                {(field) => (
                  <FormControl fullWidth>
                    <FormLabel
                      sx={{
                        mb: 1,
                        color: '#374151',
                        fontWeight: 500,
                        fontSize: '0.85rem',
                      }}
                    >
                      Título de la Posición *
                    </FormLabel>
                    <TextField
                      placeholder="Ej: Senior Frontend Developer"
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        setValidationTrigger((prev) => prev + 1);
                      }}
                      size="small"
                      fullWidth
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          bgcolor: '#f8fafc',
                        },
                      }}
                    />
                  </FormControl>
                )}
              </form.Field>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <form.Field name="department">
                    {(field) => (
                      <FormControl fullWidth>
                        <FormLabel
                          sx={{
                            mb: 1,
                            color: '#374151',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                          }}
                        >
                          Área *
                        </FormLabel>
                        <TextField
                          size="small"
                          fullWidth
                          value={field.state.value}
                          onChange={(e) => {
                            field.handleChange(e.target.value);
                            setValidationTrigger((prev) => prev + 1);
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '8px',
                              bgcolor: '#f8fafc',
                            },
                          }}
                        />
                      </FormControl>
                    )}
                  </form.Field>
                </Grid>

                <Grid size={{ xs: 12, md: 5 }}>
                  <form.Field name="seniority">
                    {(field) => (
                      <FormControl fullWidth>
                        <FormLabel
                          sx={{
                            mb: 1,
                            color: '#374151',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                          }}
                        >
                          Seniority Buscado *
                        </FormLabel>
                        <Select
                          size="small"
                          fullWidth
                          value={field.state.value}
                          onChange={(e) => {
                            field.handleChange(e.target.value);
                            setValidationTrigger((prev) => prev + 1);
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '8px',
                              bgcolor: '#f8fafc',
                            },
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
                        <FormLabel
                          sx={{
                            mb: 1,
                            color: '#374151',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                          }}
                        >
                          Ubicacion *
                        </FormLabel>
                        <Select
                          size="small"
                          fullWidth
                          value={field.state.value}
                          onChange={(e) => {
                            field.handleChange(e.target.value);
                            setValidationTrigger((prev) => prev + 1);
                          }}
                          sx={{
                            borderRadius: '8px',
                            bgcolor: '#f8fafc',
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
                        <FormLabel
                          sx={{
                            mb: 1,
                            color: '#374151',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                          }}
                        >
                          Ciudad
                        </FormLabel>
                        <TextField
                          size="small"
                          fullWidth
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '8px',
                              bgcolor: '#f8fafc',
                            },
                          }}
                        />
                      </FormControl>
                    )}
                  </form.Field>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <form.Field name="type">
                    {(field) => (
                      <FormControl fullWidth>
                        <FormLabel
                          sx={{
                            mb: 1,
                            color: '#374151',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                          }}
                        >
                          Tipo de Contratacion
                        </FormLabel>
                        <TextField
                          size="small"
                          fullWidth
                          placeholder="Ej: Full-time, Part-time, Contractor"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '8px',
                              bgcolor: '#f8fafc',
                            },
                          }}
                        />
                      </FormControl>
                    )}
                  </form.Field>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <form.Field name="status">
                    {(field) => (
                      <FormControl fullWidth>
                        <FormLabel
                          sx={{
                            mb: 1,
                            color: '#374151',
                            fontWeight: 500,
                            fontSize: '0.85rem',
                          }}
                        >
                          Estado Inicial
                        </FormLabel>
                        <Select
                          size="small"
                          fullWidth
                          value={field.state.value}
                          onChange={(e) => {
                            field.handleChange(e.target.value);
                            setValidationTrigger((prev) => prev + 1);
                          }}
                          sx={{
                            borderRadius: '8px',
                            bgcolor: '#f8fafc',
                          }}
                        >
                          <MenuItem value="draft">Borrador</MenuItem>
                          <MenuItem value="open">Abierta</MenuItem>
                          <MenuItem value="paused">Pausada</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  </form.Field>
                </Grid>
              </Grid>

              <form.Field name="description">
                {(field) => (
                  <FormControl fullWidth>
                    <FormLabel
                      sx={{
                        mb: 1,
                        color: '#374151',
                        fontWeight: 500,
                        fontSize: '0.85rem',
                      }}
                    >
                      Descripción General *
                    </FormLabel>
                    <TextField
                      multiline
                      rows={5}
                      placeholder="Describe el rol, responsabilidades principales y contexto del equipo..."
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        setValidationTrigger((prev) => prev + 1);
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          bgcolor: '#f8fafc',
                        },
                      }}
                    />
                  </FormControl>
                )}
              </form.Field>

              <form.Field name="requirements">
                {(field) => (
                  <FormControl fullWidth>
                    <FormLabel
                      sx={{
                        mb: 1,
                        color: '#374151',
                        fontWeight: 500,
                        fontSize: '0.85rem',
                      }}
                    >
                      Requisitos
                    </FormLabel>
                    <TextField
                      multiline
                      rows={3}
                      placeholder="Escribi un requisito por linea"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          bgcolor: '#f8fafc',
                        },
                      }}
                    />
                  </FormControl>
                )}
              </form.Field>

              <form.Field name="responsabilities">
                {(field) => (
                  <FormControl fullWidth>
                    <FormLabel
                      sx={{
                        mb: 1,
                        color: '#374151',
                        fontWeight: 500,
                        fontSize: '0.85rem',
                      }}
                    >
                      Responsabilidades *
                    </FormLabel>
                    <TextField
                      multiline
                      rows={4}
                      placeholder="Escribi una responsabilidad por linea"
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        setValidationTrigger((prev) => prev + 1);
                      }}
                      error={
                        !!formError &&
                        parseLines(field.state.value).length === 0
                      }
                      helperText="Este campo es requerido para crear la posicion."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          bgcolor: '#f8fafc',
                        },
                      }}
                    />
                  </FormControl>
                )}
              </form.Field>

              <form.Field name="benefits">
                {(field) => (
                  <FormControl fullWidth>
                    <FormLabel
                      sx={{
                        mb: 1,
                        color: '#374151',
                        fontWeight: 500,
                        fontSize: '0.85rem',
                      }}
                    >
                      Beneficios *
                    </FormLabel>
                    <TextField
                      multiline
                      rows={3}
                      placeholder="Escribi un beneficio por linea"
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        setValidationTrigger((prev) => prev + 1);
                      }}
                      error={
                        !!formError &&
                        parseLines(field.state.value).length === 0
                      }
                      helperText="Este campo es requerido para crear la posicion."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          bgcolor: '#f8fafc',
                        },
                      }}
                    />
                  </FormControl>
                )}
              </form.Field>
            </Stack>
          </Box>
        </Paper>

        {/* HARD SKILLS OBLIGATORIAS */}
        <Paper
          elevation={0}
          sx={{
            overflow: 'hidden',
            borderRadius: '14px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
          }}
        >
          <Box
            sx={{
              bgcolor: '#2563eb',
              color: '#ffffff',
              px: 3,
              py: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
              <Star size={16} />
              <Typography
                sx={{ fontSize: '0.95rem', fontWeight: 500, color: 'white' }}
              >
                Hard Skills Obligatorias
              </Typography>
            </Stack>
            <Chip
              label="Requerido"
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#ffffff' }}
            />
          </Box>

          <Box sx={{ p: 3 }}>
            <Alert
              icon={false}
              sx={{
                mb: 3,
                bgcolor: '#eff6ff',
                borderRadius: '10px',
                color: '#2563eb',
                fontSize: '0.75rem',
              }}
            >
              <strong>Peso:</strong> Define la importancia de cada skill en el
              matching (1-10). Mayor peso = mayor impacto en el ranking del
              candidato.
            </Alert>

            <Paper
              variant="outlined"
              sx={{ p: 2, borderRadius: '10px', borderColor: '#dbe2ea', mb: 4 }}
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography sx={{ fontSize: '0.72rem', mb: 0.8 }}>
                    Nombre de la Skill
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Ej: React, TypeScript, Node.js..."
                    value={mandatorySkillForm.name}
                    onChange={(e) =>
                      setMandatorySkillForm({
                        ...mandatorySkillForm,
                        name: e.target.value,
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <Typography sx={{ fontSize: '0.72rem', mb: 0.8 }}>
                    Peso (1-10)
                  </Typography>
                  <Select
                    fullWidth
                    size="small"
                    value={mandatorySkillForm.weight}
                    onChange={(e) =>
                      setMandatorySkillForm({
                        ...mandatorySkillForm,
                        weight: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="" disabled>
                      Seleccionar
                    </MenuItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Button
                    fullWidth
                    startIcon={<Plus size={15} />}
                    onClick={addMandatorySkill}
                    sx={{
                      mt: 3,
                      textTransform: 'none',
                      bgcolor: '#2563eb',
                      color: '#ffffff',
                      borderRadius: '8px',
                      '&:hover': { bgcolor: '#1d4ed8' },
                    }}
                  >
                    Agregar
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                py: mandatorySkills.length > 0 ? 3 : 5,
                alignItems:
                  mandatorySkills.length > 0 ? 'flex-start' : 'center',
                justifyContent:
                  mandatorySkills.length > 0 ? 'flex-start' : 'center',
                minHeight: mandatorySkills.length > 0 ? 'auto' : '120px',
                color: '#94a3b8',
              }}
            >
              {mandatorySkills.length > 0 ? (
                <Box sx={{ width: '100%' }}>
                  <Typography
                    sx={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#374151',
                      mb: 2,
                    }}
                  >
                    Skills Agregadas ({mandatorySkills.length})
                  </Typography>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                  >
                    {mandatorySkills.map((skill, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 2,
                          bgcolor: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            sx={{
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              color: '#111827',
                            }}
                          >
                            {skill.name}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          onClick={() => removeMandatorySkill(index)}
                          sx={{
                            minWidth: 'auto',
                            p: 0.5,
                            color: '#ef4444',
                            '&:hover': { bgcolor: '#fee2e2' },
                          }}
                        >
                          <X size={16} />
                        </Button>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <>
                  <CircleAlert size={36} />
                  <Typography sx={{ fontSize: '0.85rem' }}>
                    No se han agregado skills obligatorias
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </Paper>

        {/* HARD SKILLS DESEABLES */}
        <Paper
          elevation={0}
          sx={{
            overflow: 'hidden',
            borderRadius: '14px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
          }}
        >
          <Box
            sx={{
              bgcolor: '#334155',
              color: '#ffffff',
              px: 3,
              py: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
              <Star size={16} />
              <Typography
                sx={{ fontSize: '0.95rem', fontWeight: 500, color: 'white' }}
              >
                Hard Skills Deseables
              </Typography>
            </Stack>
            <Chip
              label="Opcional"
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#ffffff' }}
            />
          </Box>

          <Box sx={{ p: 3 }}>
            <Alert
              icon={false}
              sx={{
                mb: 3,
                bgcolor: '#f8fafc',
                borderRadius: '10px',
                fontSize: '0.75rem',
              }}
            >
              <strong>Nice to have:</strong> Skills que suman puntos adicionales
              pero no son excluyentes para la selección del candidato.
            </Alert>

            <Paper
              variant="outlined"
              sx={{ p: 2, borderRadius: '10px', borderColor: '#dbe2ea', mb: 4 }}
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography sx={{ fontSize: '0.72rem', mb: 0.8 }}>
                    Nombre de la Skill
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Ej: React, TypeScript, Node.js..."
                    value={desirableSkillForm.name}
                    onChange={(e) =>
                      setDesirableSkillForm({
                        ...desirableSkillForm,
                        name: e.target.value,
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <Typography sx={{ fontSize: '0.72rem', mb: 0.8 }}>
                    Peso (1-10)
                  </Typography>
                  <Select
                    fullWidth
                    size="small"
                    value={desirableSkillForm.weight}
                    onChange={(e) =>
                      setDesirableSkillForm({
                        ...desirableSkillForm,
                        weight: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="" disabled>
                      Seleccionar
                    </MenuItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Button
                    fullWidth
                    startIcon={<Plus size={15} />}
                    onClick={addDesirableSkill}
                    sx={{
                      mt: 3,
                      textTransform: 'none',
                      bgcolor: '#2563eb',
                      color: '#ffffff',
                      borderRadius: '8px',
                    }}
                  >
                    Agregar
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                py: desirableSkills.length > 0 ? 3 : 5,
                alignItems:
                  desirableSkills.length > 0 ? 'flex-start' : 'center',
                justifyContent:
                  desirableSkills.length > 0 ? 'flex-start' : 'center',
                minHeight: desirableSkills.length > 0 ? 'auto' : '120px',
                color: '#94a3b8',
              }}
            >
              {desirableSkills.length > 0 ? (
                <Box sx={{ width: '100%' }}>
                  <Typography
                    sx={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#374151',
                      mb: 2,
                    }}
                  >
                    Skills Agregadas ({desirableSkills.length})
                  </Typography>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                  >
                    {desirableSkills.map((skill, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 2,
                          bgcolor: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            sx={{
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              color: '#111827',
                            }}
                          >
                            {skill.name}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          onClick={() => removeDesirableSkill(index)}
                          sx={{
                            minWidth: 'auto',
                            p: 0.5,
                            color: '#ef4444',
                            '&:hover': { bgcolor: '#fee2e2' },
                          }}
                        >
                          <X size={16} />
                        </Button>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <>
                  <CircleAlert size={36} />
                  <Typography sx={{ fontSize: '0.85rem' }}>
                    No se han agregado skills deseables
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </Paper>

        {/* OBSERVACIONES */}
        <Paper
          elevation={0}
          sx={{
            overflow: 'hidden',
            borderRadius: '14px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
          }}
        >
          <Box sx={{ bgcolor: '#2563eb', color: '#ffffff', px: 3, py: 2 }}>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
              <FileText size={16} />
              <Typography
                sx={{ fontSize: '0.95rem', fontWeight: 500, color: 'white' }}
              >
                Observaciones y Criterios Adicionales
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ p: 3 }}>
            <Alert
              icon={false}
              sx={{
                mb: 3,
                bgcolor: '#eff6ff',
                borderRadius: '10px',
                color: '#2563eb',
                fontSize: '0.75rem',
              }}
            >
              <strong>Ejemplos:</strong> &quot;Se acepta candidato junior si
              tiene experiencia en React y TypeScript&quot;, &quot;Preferible
              experiencia en startups&quot;, &quot;Disponibilidad para viajar
              ocasionalmente&quot;
            </Alert>
            <Stack spacing={2}>
              <form.Field name="observations">
                {(field) => (
                  <TextField
                    multiline
                    rows={3}
                    fullWidth
                    label="Observaciones"
                    placeholder="Agrega consideraciones importantes para la evaluacion..."
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        bgcolor: '#f8fafc',
                      },
                    }}
                  />
                )}
              </form.Field>

              <form.Field name="additionalCriteria">
                {(field) => (
                  <TextField
                    multiline
                    rows={3}
                    fullWidth
                    label="Criterios adicionales"
                    placeholder="Escribi un criterio por linea"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        bgcolor: '#f8fafc',
                      },
                    }}
                  />
                )}
              </form.Field>
            </Stack>
          </Box>
        </Paper>

        {/* BOTONES */}
        <Stack
          direction="row"
          sx={{ pt: 1, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Button
            variant="outlined"
            onClick={onCancel}
            sx={{
              textTransform: 'none',
              borderRadius: '10px',
              borderColor: '#d1d5db',
              color: '#475569',
              px: 3,
            }}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || !isFormValid()}
            sx={{
              textTransform: 'none',
              borderRadius: '10px',
              bgcolor: '#2563eb',
              minWidth: { xs: '100%', sm: 220 },
              px: 5,
              py: 1.5,
              fontWeight: 700,
              boxShadow: '0 10px 18px rgba(37,99,235,0.25)',
              '&:hover': {
                bgcolor: '#1d4ed8',
              },
              '&:disabled': {
                bgcolor: '#cbd5e1',
                color: '#94a3b8',
                boxShadow: 'none',
              },
            }}
            title={
              !isFormValid()
                ? validateForm() || 'Completa todos los campos requeridos'
                : ''
            }
            key={`submit-btn-${validationTrigger}`}
          >
            Publicar Nueva Posicion
          </Button>
        </Stack>

        {submitError ? (
          <Alert
            severity="error"
            sx={{
              borderRadius: '12px',
              border: '1px solid #fecaca',
              bgcolor: '#fef2f2',
              color: '#991b1b',
              fontSize: '0.95rem',
              fontWeight: 600,
              '& .MuiAlert-icon': { color: '#dc2626' },
            }}
          >
            {submitError}
          </Alert>
        ) : null}
      </Stack>
    </form>
  );
}
