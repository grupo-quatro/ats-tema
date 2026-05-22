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
  CreateJobDTO,
  Skill,
  JobLocation,
} from '../../../../../../packages/shared-types/src/models/job';

interface JobFormProps {
  onSubmit: (data: CreateJobDTO) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

export default function JobForm({
  onSubmit,
  isLoading = false,
  onCancel,
}: JobFormProps) {
  const [mandatorySkills, setMandatorySkills] = useState<Skill[]>([]);
  const [desirableSkills, setDesirableSkills] = useState<Skill[]>([]);
  const [validationTrigger, setValidationTrigger] = useState(0);

  const [mandatorySkillForm, setMandatorySkillForm] = useState({
    name: '',
    weight: '5',
  });

  const [desirableSkillForm, setDesirableSkillForm] = useState({
    name: '',
    weight: '5',
  });

  const form = useForm({
    defaultValues: {
      title: '',
      department: '',
      seniority: '',
      location: 'remote',
      city: '',
      description: '',
      requirements: [],
      observations: '',
      additionalCriteria: [],
      slug: '',
      status: 'draft',
      responsabilities: [],
      benefits: [],
      hiringManagerId: '',
    },

    onSubmit: async ({ value }) => {
      const validationError = validateForm();
      if (validationError) {
        alert(validationError);
        return;
      }

      const payload: CreateJobDTO = {
        ...value,
        location: value.location as JobLocation,
        skills: [...mandatorySkills, ...desirableSkills],
        slug: value.title?.toLowerCase().replace(/\s+/g, '-') || '',
        status: 'draft',
      };

      await onSubmit(payload);
    },
  });

  const addMandatorySkill = () => {
    if (!mandatorySkillForm.name.trim()) return;

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
      weight: '5',
    });

    // Trigger re-validation
    setValidationTrigger((prev) => prev + 1);
  };

  const addDesirableSkill = () => {
    if (!desirableSkillForm.name.trim()) return;

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
      weight: '5',
    });

    // Trigger re-validation
    setValidationTrigger((prev) => prev + 1);
  };

  const removeMandatorySkill = (index: number) => {
    setMandatorySkills(mandatorySkills.filter((_, i) => i !== index));
    // Trigger re-validation
    setValidationTrigger((prev) => prev + 1);
  };

  const removeDesirableSkill = (index: number) => {
    setDesirableSkills(desirableSkills.filter((_, i) => i !== index));
    // Trigger re-validation
    setValidationTrigger((prev) => prev + 1);
  };

  const validateForm = (): string | null => {
    const title = form.state.values.title || '';
    const department = form.state.values.department || '';
    const seniority = form.state.values.seniority || '';
    const description = form.state.values.description || '';

    if (!title.trim()) {
      return 'El título de la posición es obligatorio';
    }
    if (!department.trim()) {
      return 'El área es obligatoria';
    }
    if (!seniority.trim()) {
      return 'El nivel de seniority es obligatorio';
    }
    if (!description.trim()) {
      return 'La descripción general es obligatoria';
    }
    if (mandatorySkills.length === 0) {
      return 'Debe agregar al menos una skill obligatoria';
    }

    return null;
  };

  const isFormValid = (): boolean => {
    // Leer los valores actuales del form
    const title = (form.state.values.title || '').trim();
    const department = (form.state.values.department || '').trim();
    const seniority = (form.state.values.seniority || '').trim();
    const description = (form.state.values.description || '').trim();

    // Validar que todos los campos requeridos estén completos
    const allFieldsComplete =
      title.length > 0 &&
      department.length > 0 &&
      seniority.length > 0 &&
      description.length > 0;

    // Validar que haya al menos una skill obligatoria
    const hasRequiredSkills = mandatorySkills.length > 0;

    return allFieldsComplete && hasRequiredSkills;
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
        {/* ALERTA IA */}

        <Alert
          icon={<Sparkles size={16} />}
          sx={{
            borderRadius: '12px',
            bgcolor: '#edf4ff',
            border: '1px solid #dbeafe',
            color: '#2563eb',
            alignItems: 'flex-start',

            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '0.82rem',
            }}
          >
            Matching Automático con IA
          </Typography>

          <Typography
            sx={{
              fontSize: '0.75rem',
              mt: 0.5,
            }}
          >
            La configuración que realices será utilizada por la IA para evaluar,
            rankear y sugerir los mejores candidatos. Los pesos asignados a cada
            skill determinarán la relevancia en el scoring final.
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

          <Box
            sx={{
              p: 3,
              bgcolor: '#ffffff',
            }}
          >
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
                <Grid size={{ xs: 12, md: 6 }}>
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

                <Grid size={{ xs: 12, md: 6 }}>
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
            <Stack
              direction="row"
              sx={{
                gap: 1,
                alignItems: 'center',
              }}
            >
              <Star size={16} />

              <Typography
                sx={{
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: 'white',
                }}
              >
                Hard Skills Obligatorias
              </Typography>
            </Stack>

            <Chip
              label="Requerido"
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
              }}
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
              sx={{
                p: 2,
                borderRadius: '10px',
                borderColor: '#dbe2ea',
                mb: 4,
              }}
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      mb: 0.8,
                    }}
                  >
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

                <Grid size={{ xs: 12, md: 3 }}>
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      mb: 0.8,
                    }}
                  >
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

                      '&:hover': {
                        bgcolor: '#1d4ed8',
                      },
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
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                    }}
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
                          <Typography
                            sx={{
                              fontSize: '0.75rem',
                              color: '#6b7280',
                              mt: 0.5,
                            }}
                          >
                            Peso: {skill.weight}/10
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          onClick={() => removeMandatorySkill(index)}
                          sx={{
                            minWidth: 'auto',
                            p: 0.5,
                            color: '#ef4444',
                            '&:hover': {
                              bgcolor: '#fee2e2',
                            },
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
                  <Typography
                    sx={{
                      fontSize: '0.85rem',
                    }}
                  >
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
            <Stack
              direction="row"
              sx={{
                gap: 1,
                alignItems: 'center',
              }}
            >
              <Star size={16} />

              <Typography
                sx={{
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: 'white',
                }}
              >
                Hard Skills Deseables
              </Typography>
            </Stack>

            <Chip
              label="Opcional"
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
              }}
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
              sx={{
                p: 2,
                borderRadius: '10px',
                borderColor: '#dbe2ea',
                mb: 4,
              }}
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      mb: 0.8,
                    }}
                  >
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

                <Grid size={{ xs: 12, md: 3 }}>
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      mb: 0.8,
                    }}
                  >
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
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                    }}
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
                          <Typography
                            sx={{
                              fontSize: '0.75rem',
                              color: '#6b7280',
                              mt: 0.5,
                            }}
                          >
                            Peso: {skill.weight}/10
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          onClick={() => removeDesirableSkill(index)}
                          sx={{
                            minWidth: 'auto',
                            p: 0.5,
                            color: '#ef4444',
                            '&:hover': {
                              bgcolor: '#fee2e2',
                            },
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
                  <Typography
                    sx={{
                      fontSize: '0.85rem',
                    }}
                  >
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
          <Box
            sx={{
              bgcolor: '#2563eb',
              color: '#ffffff',
              px: 3,
              py: 2,
            }}
          >
            <Stack
              direction="row"
              sx={{
                gap: 1,
                alignItems: 'center',
              }}
            >
              <FileText size={16} />

              <Typography
                sx={{
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: 'white',
                }}
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

            <TextField
              multiline
              rows={4}
              fullWidth
              placeholder="Agrega criterios especiales de selección, excepciones o consideraciones importantes para la evaluación..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  bgcolor: '#f8fafc',
                },
              }}
            />
          </Box>
        </Paper>

        {/* BOTONES */}

        <Stack
          direction="row"
          sx={{
            pt: 1,
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
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
            disabled={
              isLoading || !isFormValid() || mandatorySkills.length === 0
            }
            sx={{
              textTransform: 'none',
              borderRadius: '10px',
              bgcolor: '#2563eb',
              px: 4,
              py: 1.2,
              boxShadow: '0 10px 18px rgba(37,99,235,0.25)',

              '&:hover': {
                bgcolor:
                  isLoading || !isFormValid() || mandatorySkills.length === 0
                    ? '#2563eb'
                    : '#1d4ed8',
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
                : mandatorySkills.length === 0
                  ? 'Debe agregar al menos una skill obligatoria'
                  : ''
            }
            key={`submit-btn-${validationTrigger}`}
          >
            Publicar Nueva Posicion
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
