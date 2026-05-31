'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import {
  alpha,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import type { ParsedEducation, ParsedExperience } from '@ats/shared-types';

import type { MinimalFormFieldComponent } from './ManualProfileFormField';
import { ManualProfileFormField } from './ManualProfileFormField';
import {
  useCandidateProfileForConfirmation,
  useConfirmCandidateProfile,
  useDiscardCandidateDraft,
  useRegisterCvFlow,
  useRegisterManual,
} from '../../hooks/usePostulation';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ManualCandidateValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  yearsOfExperience: string;
  education: string;
  technicalSkills: string;
  professionalSummary: string;
};

const defaultValues: ManualCandidateValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  location: '',
  yearsOfExperience: '',
  education: '',
  technicalSkills: '',
  professionalSummary: '',
};

const emptyExperience = (): ParsedExperience => ({
  role: '',
  company: '',
  startDate: '',
  endDate: '',
});

const emptyEducation = (): ParsedEducation => ({
  degree: '',
  institution: '',
  startDate: '',
  endDate: '',
});

function requiredTrim(message: string) {
  const fn = ({ value }: { value: string }) =>
    !value?.trim() ? message : undefined;
  return { onBlur: fn, onSubmit: fn };
}

function validateEmail({ value }: { value: string }): string | undefined {
  if (!value?.trim()) return 'El email es requerido';
  if (!EMAIL_REGEX.test(value)) return 'Email inválido';
  return undefined;
}

function validatePhone({ value }: { value: string }): string | undefined {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return 'El teléfono es requerido';
  if (!/^[0-9]+$/.test(trimmed)) return 'Solo se permiten dígitos';
  if (trimmed.length < 8 || trimmed.length > 15) return 'Número inválido';
  return undefined;
}

function validateYearsOfExperience({
  value,
}: {
  value: string;
}): string | undefined {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 80) {
    return 'Ingresá un número válido';
  }
  return undefined;
}

function scrollToFirstInvalidField() {
  window.setTimeout(() => {
    const invalidField = document.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    if (!invalidField) return;

    invalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    invalidField.focus({ preventScroll: true });
  }, 0);
}

const v = {
  firstName: requiredTrim('El nombre es requerido'),
  lastName: requiredTrim('Los apellidos son requeridos'),
  email: { onBlur: validateEmail, onSubmit: validateEmail },
  phone: { onBlur: validatePhone, onSubmit: validatePhone },
  yearsOfExperience: {
    onBlur: validateYearsOfExperience,
    onSubmit: validateYearsOfExperience,
  },
};

const PAGE_MAX_WIDTH = 900;
const CARD_SHADOW =
  '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.06)';

type ManualCandidateFormProps = {
  jobId: string;
  jobTitle?: string;
  initialValues?: Partial<ManualCandidateValues>;
  preloadedFile?: File;
};

function SectionHeader({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      {icon}
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  );
}

export function ManualCandidateForm({
  jobId,
  jobTitle,
  initialValues,
  preloadedFile,
}: ManualCandidateFormProps) {
  const router = useRouter();
  const backHref = `/jobs/${jobId}`;
  const manualRegistration = useRegisterManual();
  const cvRegistration = useRegisterCvFlow();
  const profileConfirmation = useConfirmCandidateProfile();
  const discardDraft = useDiscardCandidateDraft();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cvSectionRef = useRef<HTMLDivElement>(null);
  const [cvFile, setCvFile] = useState<File | null>(preloadedFile ?? null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [cvFlow, setCvFlow] = useState<{
    candidateId: string;
    applicationId: string;
  } | null>(null);
  const [processingDialogOpen, setProcessingDialogOpen] = useState(false);
  const [discardAction, setDiscardAction] = useState<'exit' | 'remove' | null>(
    null,
  );
  const appliedProfileCandidateIdRef = useRef<string | null>(null);
  const [experiences, setExperiences] = useState<ParsedExperience[]>([
    emptyExperience(),
  ]);
  const [educations, setEducations] = useState<ParsedEducation[]>([
    emptyEducation(),
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    setFileError(null);
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Solo se aceptan archivos PDF.');
      return;
    }

    if (cvFlow) {
      setDiscardAction('remove');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    appliedProfileCandidateIdRef.current = null;
    setCvFlow(null);
    setCvFile(file);
  };

  const resetProfileFields = () => {
    form.setFieldValue('firstName', '');
    form.setFieldValue('lastName', '');
    form.setFieldValue('email', '');
    form.setFieldValue('phone', '');
    form.setFieldValue('location', '');
    form.setFieldValue('yearsOfExperience', '');
    form.setFieldValue('education', '');
    form.setFieldValue('technicalSkills', '');
    form.setFieldValue('professionalSummary', '');
    setExperiences([emptyExperience()]);
    setEducations([emptyEducation()]);
  };

  const clearCvSelection = ({ resetProfile }: { resetProfile: boolean }) => {
    setCvFile(null);
    setCvFlow(null);
    appliedProfileCandidateIdRef.current = null;
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (resetProfile) {
      resetProfileFields();
    }
  };

  const handleCancel = () => {
    if (cvFlow) {
      setDiscardAction('exit');
      return;
    }

    router.push(backHref);
  };

  const handleRemoveCv = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (cvFlow) {
      setDiscardAction('remove');
      return;
    }

    clearCvSelection({ resetProfile: false });
  };

  const handleConfirmDiscard = async () => {
    const action = discardAction;
    if (!action) {
      return;
    }

    try {
      if (cvFlow) {
        await discardDraft.mutateAsync(cvFlow);
      }

      setDiscardAction(null);

      if (action === 'exit') {
        router.push(backHref);
        return;
      }

      clearCvSelection({ resetProfile: true });
    } catch {
      // el error queda en discardDraft.error
    }
  };

  const updateExperience = (
    index: number,
    field: keyof ParsedExperience,
    value: string,
  ) => {
    setExperiences((prev) =>
      prev.map((exp, i) => (i === index ? { ...exp, [field]: value } : exp)),
    );
  };

  const updateEducation = (
    index: number,
    field: keyof ParsedEducation,
    value: string,
  ) => {
    setEducations((prev) =>
      prev.map((edu, i) => (i === index ? { ...edu, [field]: value } : edu)),
    );
  };

  const form = useForm({
    defaultValues: { ...defaultValues, ...initialValues },
    onSubmit: async ({ value }) => {
      try {
        const parsedExperience = experiences.filter(
          (e) => e.role?.trim() || e.company?.trim(),
        );
        const parsedEducation = educations.filter(
          (e) => e.degree?.trim() || e.institution?.trim(),
        );

        const profilePayload = {
          firstName: value.firstName.trim(),
          lastName: value.lastName.trim(),
          email: value.email.trim(),
          phone: value.phone.trim(),
          location: value.location.trim() || undefined,
          yearsOfExperience: value.yearsOfExperience.trim()
            ? Number(value.yearsOfExperience.trim())
            : undefined,
          education: value.education.trim() || undefined,
          technicalSkills: value.technicalSkills
            ? value.technicalSkills
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
          professionalSummary: value.professionalSummary.trim() || undefined,
          parsedExperience: parsedExperience.length
            ? parsedExperience
            : undefined,
          parsedEducation: parsedEducation.length ? parsedEducation : undefined,
        };

        const result = cvFlow
          ? await profileConfirmation.mutateAsync({
              candidateId: cvFlow.candidateId,
              applicationId: cvFlow.applicationId,
              profile: profilePayload,
            })
          : await manualRegistration.mutateAsync({
              payload: {
                jobId,
                ...profilePayload,
              },
              file: cvFile ?? undefined,
            });
        router.push(
          `/postulation/${jobId}/success?status=${result.cvParseStatus}`,
        );
      } catch {
        // el error queda en los estados de mutation/query
      }
    },
  });

  const profileQuery = useCandidateProfileForConfirmation({
    candidateId: cvFlow?.candidateId,
    applicationId: cvFlow?.applicationId,
    enabled: Boolean(cvFlow),
  });

  const cvParseStatus = profileQuery.data?.cvParseStatus;
  const isParsingCv =
    cvParseStatus === 'pending' || cvParseStatus === 'processing';
  const isSubmittingRegistration =
    manualRegistration.isPending || profileConfirmation.isPending;
  const isCvActionPending = cvRegistration.isPending || isParsingCv;
  const isDiscardingDraft = discardDraft.isPending;
  const submitError =
    manualRegistration.error ??
    profileConfirmation.error ??
    cvRegistration.error ??
    profileQuery.error ??
    discardDraft.error;

  useEffect(() => {
    const data = profileQuery.data;
    if (
      !data ||
      data.cvParseStatus !== 'done' ||
      appliedProfileCandidateIdRef.current === data.candidateId
    ) {
      return;
    }

    const { profile } = data;
    form.setFieldValue('firstName', profile.firstName ?? '');
    form.setFieldValue('lastName', profile.lastName ?? '');
    form.setFieldValue('email', profile.email ?? '');
    form.setFieldValue('phone', profile.phone ?? '');
    form.setFieldValue('location', profile.location ?? '');
    form.setFieldValue(
      'yearsOfExperience',
      profile.yearsOfExperience === undefined
        ? ''
        : String(profile.yearsOfExperience),
    );
    form.setFieldValue('education', profile.education ?? '');
    form.setFieldValue(
      'technicalSkills',
      profile.technicalSkills?.join(', ') ?? '',
    );
    form.setFieldValue(
      'professionalSummary',
      profile.professionalSummary ?? '',
    );
    setExperiences(
      profile.parsedExperience?.length
        ? profile.parsedExperience
        : [emptyExperience()],
    );
    setEducations(
      profile.parsedEducation?.length
        ? profile.parsedEducation
        : [emptyEducation()],
    );
    appliedProfileCandidateIdRef.current = data.candidateId;
    setProcessingDialogOpen(false);
  }, [form, profileQuery.data]);

  const handleAutocompleteFromCv = async () => {
    if (!cvFile) {
      setFileError('Adjuntá un PDF para autocompletar el perfil.');
      return;
    }

    setFileError(null);
    appliedProfileCandidateIdRef.current = null;
    setProcessingDialogOpen(true);

    try {
      const result = await cvRegistration.mutateAsync({ jobId, file: cvFile });
      setCvFlow({
        candidateId: result.candidateId,
        applicationId: result.applicationId,
      });
    } catch {
      setProcessingDialogOpen(false);
    }
  };

  const Field: MinimalFormFieldComponent =
    form.Field as MinimalFormFieldComponent;

  return (
    <Box
      sx={(theme) => ({
        minHeight: '100vh',
        py: { xs: 3, md: 6 },
        px: { xs: 2, md: 3 },
        background: `linear-gradient(to bottom right, ${theme.palette.background.default}, ${alpha(theme.palette.primary.main, 0.08)})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      })}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: PAGE_MAX_WIDTH,
          p: 0,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: CARD_SHADOW,
        }}
      >
        <Box
          sx={(theme) => ({
            px: { xs: 3, md: 4 },
            py: 3,
            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          })}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <Box sx={{ flex: 1, pr: 1 }}>
              <Typography
                sx={{
                  fontSize: { xs: 22, sm: 24 },
                  fontWeight: 500,
                  color: 'primary.contrastText',
                  mb: 0.5,
                }}
              >
                {jobTitle ?? 'Completa tu perfil'}
              </Typography>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: 'primary.contrastText',
                }}
              >
                Ingresa tu información profesional
              </Typography>
            </Box>
            <IconButton
              type="button"
              onClick={handleCancel}
              aria-label="Cerrar"
              sx={{ color: 'primary.contrastText', mt: -0.5 }}
              disabled={isSubmittingRegistration || isCvActionPending}
            >
              <X size={20} aria-hidden />
            </IconButton>
          </Box>
        </Box>

        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!cvFile) {
                setFileError('Se debe adjuntar un currículum en PDF.');
                cvSectionRef.current?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                });
                return;
              }
              setFileError(null);
              void form.handleSubmit();
              scrollToFirstInvalidField();
            }}
            noValidate
          >
            {/* CV */}
            <Box ref={cvSectionRef} sx={{ mb: 4 }}>
              <SectionHeader icon={<FileText size={16} />} label="CV" />
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: cvFile ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: 'primary.main' },
                }}
                onClick={() => {
                  if (cvFlow) {
                    setDiscardAction('remove');
                    return;
                  }

                  fileInputRef.current?.click();
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {cvFile ? (
                  <>
                    <FileText size={28} style={{ marginBottom: 6 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {cvFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(cvFile.size / 1024).toFixed(0)} KB — Clic para cambiar
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Button
                        type="button"
                        size="small"
                        color="error"
                        onClick={handleRemoveCv}
                        disabled={
                          isCvActionPending ||
                          isSubmittingRegistration ||
                          isDiscardingDraft
                        }
                        sx={{ textTransform: 'none' }}
                      >
                        Quitar CV
                      </Button>
                    </Box>
                  </>
                ) : (
                  <>
                    <Upload size={28} style={{ marginBottom: 6 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Adjuntá tu CV en PDF
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hacé clic o arrastrá el archivo aquí
                    </Typography>
                  </>
                )}
              </Box>
              {fileError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {fileError}
                </Alert>
              )}
              {cvFile && (
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={handleAutocompleteFromCv}
                  startIcon={
                    isCvActionPending ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Sparkles size={16} />
                    )
                  }
                  disabled={isCvActionPending || isSubmittingRegistration}
                  sx={{ mt: 1.5, textTransform: 'none', borderRadius: '10px' }}
                >
                  {isCvActionPending
                    ? 'Procesando CV...'
                    : 'Autocompletar desde CV'}
                </Button>
              )}
              {cvFlow &&
                appliedProfileCandidateIdRef.current === cvFlow.candidateId && (
                  <Alert severity="success" sx={{ mt: 1.5 }}>
                    Datos extraídos. Revisá el perfil antes de finalizar.
                  </Alert>
                )}
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* Información de contacto */}
            <Box sx={{ mb: 4 }}>
              <SectionHeader
                icon={<User size={16} />}
                label="Información de Contacto"
              />
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 3,
                }}
              >
                <ManualProfileFormField
                  Field={Field}
                  name="firstName"
                  label="Nombre"
                  Icon={User}
                  required
                  validators={v.firstName}
                />
                <ManualProfileFormField
                  Field={Field}
                  name="lastName"
                  label="Apellidos"
                  Icon={User}
                  required
                  validators={v.lastName}
                />
                <ManualProfileFormField
                  Field={Field}
                  name="email"
                  label="Email"
                  Icon={Mail}
                  required
                  validators={v.email}
                  fieldType="email"
                  autoComplete="email"
                />
                <ManualProfileFormField
                  Field={Field}
                  name="phone"
                  label="Teléfono"
                  Icon={Phone}
                  required
                  validators={v.phone}
                  fieldType="tel"
                  autoComplete="tel"
                />
                <ManualProfileFormField
                  Field={Field}
                  name="location"
                  label="Ubicación"
                  Icon={MapPin}
                  gridColumnFull
                />
                <ManualProfileFormField
                  Field={Field}
                  name="yearsOfExperience"
                  label="Años de experiencia"
                  Icon={Briefcase}
                  validators={v.yearsOfExperience}
                  fieldType="number"
                  autoComplete="off"
                />
                <ManualProfileFormField
                  Field={Field}
                  name="education"
                  label="Formación principal"
                  Icon={GraduationCap}
                  placeholder="Ej. Tecnicatura en Análisis de Sistemas"
                />
              </Box>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* Experiencia laboral */}
            <Box sx={{ mb: 4 }}>
              <SectionHeader
                icon={<Briefcase size={16} />}
                label="Experiencia Laboral"
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {experiences.map((exp, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                    }}
                  >
                    {experiences.length > 1 && (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          mb: 1,
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() =>
                            setExperiences((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                          aria-label="Eliminar experiencia"
                        >
                          <Trash2 size={15} />
                        </IconButton>
                      </Box>
                    )}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          md: 'repeat(2, 1fr)',
                        },
                        gap: 2,
                      }}
                    >
                      <TextField
                        label="Cargo"
                        value={exp.role ?? ''}
                        onChange={(e) =>
                          updateExperience(index, 'role', e.target.value)
                        }
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="Empresa"
                        value={exp.company ?? ''}
                        onChange={(e) =>
                          updateExperience(index, 'company', e.target.value)
                        }
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="Desde"
                        value={exp.startDate ?? ''}
                        onChange={(e) =>
                          updateExperience(index, 'startDate', e.target.value)
                        }
                        fullWidth
                        size="small"
                        placeholder="Ej. Mar 2020"
                      />
                      <TextField
                        label="Hasta"
                        value={exp.endDate ?? ''}
                        onChange={(e) =>
                          updateExperience(index, 'endDate', e.target.value)
                        }
                        fullWidth
                        size="small"
                        placeholder="Ej. Actualidad"
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
              <Button
                startIcon={<Plus size={16} />}
                onClick={() =>
                  setExperiences((prev) => [...prev, emptyExperience()])
                }
                sx={{ mt: 2, textTransform: 'none' }}
              >
                Agregar experiencia
              </Button>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* Educación */}
            <Box sx={{ mb: 4 }}>
              <SectionHeader
                icon={<GraduationCap size={16} />}
                label="Educación"
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {educations.map((edu, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                    }}
                  >
                    {educations.length > 1 && (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          mb: 1,
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() =>
                            setEducations((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                          aria-label="Eliminar educación"
                        >
                          <Trash2 size={15} />
                        </IconButton>
                      </Box>
                    )}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          md: 'repeat(2, 1fr)',
                        },
                        gap: 2,
                      }}
                    >
                      <TextField
                        label="Título"
                        value={edu.degree ?? ''}
                        onChange={(e) =>
                          updateEducation(index, 'degree', e.target.value)
                        }
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="Institución"
                        value={edu.institution ?? ''}
                        onChange={(e) =>
                          updateEducation(index, 'institution', e.target.value)
                        }
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label="Desde"
                        value={edu.startDate ?? ''}
                        onChange={(e) =>
                          updateEducation(index, 'startDate', e.target.value)
                        }
                        fullWidth
                        size="small"
                        placeholder="Ej. 2016"
                      />
                      <TextField
                        label="Hasta"
                        value={edu.endDate ?? ''}
                        onChange={(e) =>
                          updateEducation(index, 'endDate', e.target.value)
                        }
                        fullWidth
                        size="small"
                        placeholder="Ej. 2020"
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
              <Button
                startIcon={<Plus size={16} />}
                onClick={() =>
                  setEducations((prev) => [...prev, emptyEducation()])
                }
                sx={{ mt: 2, textTransform: 'none' }}
              >
                Agregar educación
              </Button>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* Perfil profesional */}
            <Box sx={{ mb: 4 }}>
              <SectionHeader
                icon={<Briefcase size={16} />}
                label="Perfil Profesional"
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <ManualProfileFormField
                  Field={Field}
                  name="technicalSkills"
                  label="Habilidades técnicas"
                  Icon={Briefcase}
                  placeholder="Separá con coma (ej. React, TypeScript)"
                />
                <ManualProfileFormField
                  Field={Field}
                  name="professionalSummary"
                  label="Resumen profesional"
                  Icon={FileText}
                  multiline
                  minRows={4}
                  placeholder="Contá tu experiencia y objetivos en pocas líneas."
                />
              </Box>
            </Box>

            {submitError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {submitError instanceof Error
                  ? submitError.message
                  : 'Ocurrió un error al registrar. Intentá de nuevo.'}
              </Alert>
            )}

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Button
                variant="outlined"
                type="button"
                onClick={handleCancel}
                sx={{ px: 3 }}
                disabled={
                  isSubmittingRegistration ||
                  isCvActionPending ||
                  isDiscardingDraft
                }
              >
                Cancelar
              </Button>

              <form.Subscribe selector={(state) => [state.isSubmitting]}>
                {([isSubmitting]) => (
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={
                      isSubmitting ||
                      isSubmittingRegistration ||
                      isCvActionPending
                    }
                    startIcon={
                      isSubmittingRegistration ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : null
                    }
                  >
                    {isSubmittingRegistration
                      ? 'Registrando...'
                      : 'Finalizar registro'}
                  </Button>
                )}
              </form.Subscribe>
            </Box>
          </form>
        </CardContent>
      </Card>

      <Dialog
        open={processingDialogOpen}
        onClose={
          cvParseStatus === 'failed'
            ? () => setProcessingDialogOpen(false)
            : undefined
        }
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {cvParseStatus === 'failed'
            ? 'No pudimos procesar tu CV'
            : 'Estamos analizando tu CV'}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              py: 1,
            }}
          >
            {cvParseStatus === 'failed' ? null : <CircularProgress size={24} />}
            <Box>
              <Typography variant="body2">
                {cvRegistration.isPending
                  ? 'Subiendo archivo...'
                  : cvParseStatus === 'failed'
                    ? 'Podés completar tus datos manualmente para continuar.'
                    : 'Extrayendo la información principal del perfil.'}
              </Typography>
              {profileQuery.data?.cvParseError && (
                <Typography variant="caption" color="error">
                  {profileQuery.data.cvParseError}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        {cvParseStatus === 'failed' && (
          <DialogActions>
            <Button onClick={() => setProcessingDialogOpen(false)}>
              Completar manualmente
            </Button>
          </DialogActions>
        )}
      </Dialog>

      <Dialog
        open={discardAction !== null}
        onClose={isDiscardingDraft ? undefined : () => setDiscardAction(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {discardAction === 'exit'
            ? 'Descartar postulación en progreso'
            : 'Quitar CV procesado'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {discardAction === 'exit'
              ? 'Se eliminará el CV subido y los datos extraídos para esta postulación.'
              : 'Se eliminará el CV subido y se limpiarán los datos extraídos para que puedas elegir otro archivo.'}
          </Typography>
          {discardDraft.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {discardDraft.error instanceof Error
                ? discardDraft.error.message
                : 'No se pudo descartar la postulación.'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            type="button"
            onClick={() => setDiscardAction(null)}
            disabled={isDiscardingDraft}
          >
            Seguir editando
          </Button>
          <Button
            type="button"
            color="error"
            onClick={handleConfirmDiscard}
            disabled={isDiscardingDraft}
            startIcon={
              isDiscardingDraft ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
          >
            {discardAction === 'exit' ? 'Descartar' : 'Quitar CV'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
