'use client';

import { useForm } from '@tanstack/react-form';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  User,
  X,
  Upload,
} from 'lucide-react';

import type { MinimalFormFieldComponent } from './ManualProfileFormField';
import { ManualProfileFormField } from './ManualProfileFormField';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ManualCandidateValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  desiredPosition: string;
  experienceYears: string;
  education: string;
  technicalSkills: string;
  professionalSummary: string;
  resume: string;
};

const defaultValues: ManualCandidateValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  location: '',
  desiredPosition: '',
  experienceYears: '',
  education: '',
  technicalSkills: '',
  professionalSummary: '',
  resume: '',
};

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
  console.log('archivo de arriba');
  if (!trimmed) return 'El teléfono es requerido';
  if (!/^[0-9]+$/.test(trimmed)) return 'Solo se permiten dígitos';
  if (trimmed.length < 8 || trimmed.length > 15) return 'Número inválido';
  return undefined;
}

const v = {
  firstName: requiredTrim('El nombre es requerido'),
  lastName: requiredTrim('Los apellidos son requeridos'),
  email: { onBlur: validateEmail, onSubmit: validateEmail },
  phone: { onBlur: validatePhone, onSubmit: validatePhone },
  desiredPosition: requiredTrim('La posición deseada es requerida'),
  resume: requiredTrim('El CV es requerido'),
};

const PAGE_MAX_WIDTH = 900;
const CARD_SHADOW =
  '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.06)';

type ManualCandidateFormProps = { jobId: string };

export function ManualCandidateForm({ jobId }: ManualCandidateFormProps) {
  const router = useRouter();
  const backHref = `/postulation/${jobId}`;
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await Promise.resolve();
      void value;
      router.push(backHref);
    },
  });

  /* Narrowing estable: coincide con uso real de cada campo como string controlado */
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
      <Box
        sx={{
          width: '100%',
          maxWidth: PAGE_MAX_WIDTH,
          mb: 3,
          textAlign: 'center',
        }}
      >
        <Typography variant="h2" sx={{ mb: 0.5 }}>
          Formulario de carga manual
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Completá los campos para registrar tu perfil profesional
        </Typography>
      </Box>

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
                Completa tu perfil
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
              component={Link}
              href={backHref}
              aria-label="Cerrar"
              sx={{ color: 'primary.contrastText', mt: -0.5 }}
            >
              <X size={20} aria-hidden />
            </IconButton>
          </Box>
        </Box>

        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
            noValidate
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 3,
                mb: 3,
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
              />
              <ManualProfileFormField
                Field={Field}
                name="desiredPosition"
                label="Posición deseada"
                Icon={Briefcase}
                required
                validators={v.desiredPosition}
              />
              <ManualProfileFormField
                Field={Field}
                name="experienceYears"
                label="Años de experiencia"
                Icon={Briefcase}
                placeholder="Ej. 5 años"
              />
              <ManualProfileFormField
                Field={Field}
                name="education"
                label="Educación"
                Icon={GraduationCap}
                placeholder="Título académico e institución"
              />
              <ManualProfileFormField
                Field={Field}
                name="technicalSkills"
                label="Habilidades técnicas"
                Icon={Briefcase}
                gridColumnFull
                placeholder="Separá con coma (ej. React, TypeScript)"
              />
              <ManualProfileFormField
                Field={Field}
                name="professionalSummary"
                label="Resumen profesional"
                Icon={FileText}
                gridColumnFull
                multiline
                minRows={4}
                placeholder="Contá tu experiencia y objetivos en pocas líneas."
              />
              <ManualProfileFormField
                Field={Field}
                name="resume"
                label="CV / Currículum (PDF)"
                Icon={Upload}
                required
                validators={v.resume}
                gridColumnFull
                fieldType="file"
                accept=".pdf"
                placeholder="Seleccionar archivo PDF"
              />
            </Box>

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
                component={Link}
                href={backHref}
                sx={{ px: 3 }}
              >
                Cancelar
              </Button>

              <form.Subscribe selector={(state) => [state.isSubmitting]}>
                {([isSubmitting]) => (
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                  >
                    Finalizar registro
                  </Button>
                )}
              </form.Subscribe>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
