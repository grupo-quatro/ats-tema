import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Skill } from '@ats/shared-types';
import { saveCandidacyNote } from '../../../shared/api/candidacyNotesApi';
import { saveInterviewForm } from '../../../shared/api/interviewFormsApi';
import AppSnackbar from '@/shared/components/AppSnackbar';

interface Props {
  applicationId: string;
  skills: Skill[];
  onClose: () => void;
  onSave?: () => void | Promise<void>;
}

export function TechnicalInterviewForm({
  applicationId,
  skills,
  onClose,
  onSave,
}: Props) {
  const initialRatings: Record<string, number> = {};
  skills.forEach((s) => (initialRatings[s.name] = 0));

  const [ratings, setRatings] =
    useState<Record<string, number>>(initialRatings);
  const [overall, setOverall] = useState<number>(0);
  const [decision, setDecision] = useState('');
  const [comments, setComments] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const mandatory = skills.filter((s) => s.type === 'mandatory');
  const desirable = skills.filter((s) => s.type === 'desirable');

  const trimmedComments = comments.trim();
  const trimmedDecision = decision.trim();
  const unratedMandatory = mandatory.filter(
    (skill) => (ratings[skill.name] ?? 0) < 1,
  );
  const isFormValid =
    overall >= 1 &&
    trimmedDecision.length > 0 &&
    trimmedComments.length > 0 &&
    unratedMandatory.length === 0;

  const handleSave = async () => {
    if (unratedMandatory.length > 0) {
      setErrorMessage(
        `Calificá todas las skills obligatorias: ${unratedMandatory.map((s) => s.name).join(', ')}.`,
      );
      return;
    }

    if (!overall) {
      setErrorMessage('La calificación general es obligatoria.');
      return;
    }

    if (!trimmedDecision) {
      setErrorMessage('La decisión recomendada es obligatoria.');
      return;
    }

    if (!trimmedComments) {
      setErrorMessage('Los comentarios y observaciones son obligatorios.');
      return;
    }

    setErrorMessage('');
    setIsSaving(true);

    try {
      const skillQuestions = skills.map((skill) => ({
        question: skill.name,
        answer: 'Evaluación registrada en entrevista.',
        rating: ratings[skill.name] || undefined,
      }));

      await saveInterviewForm({
        applicationId,
        type: 'tech',
        title: 'Evaluación técnica – Entrevista',
        overallRating: overall,
        decision: trimmedDecision,
        questions: [
          ...skillQuestions,
          {
            question: 'Nivel técnico general',
            answer: 'Evaluación registrada en entrevista.',
            rating: overall,
          },
          {
            question: 'Decisión recomendada',
            answer: trimmedDecision,
          },
          {
            question: 'Comentarios y observaciones',
            answer: trimmedComments,
          },
        ],
      });

      await saveCandidacyNote({
        applicationId,
        text: `[Entrevista técnica] ${trimmedComments}`,
      });

      await onSave?.();
      onClose();
    } catch {
      setErrorMessage('No se pudo guardar la evaluación.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSkillRow = (skill: Skill, required: boolean) => (
    <Box
      key={skill.name}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Typography sx={{ fontWeight: 600, minWidth: 160 }}>
        {skill.name}
        {required && (
          <Typography component="span" color="error.main">
            {' '}
            *
          </Typography>
        )}
      </Typography>
      <Rating
        value={ratings[skill.name] || 0}
        onChange={(_, value) =>
          setRatings((current) => ({ ...current, [skill.name]: value || 0 }))
        }
        disabled={isSaving}
      />
    </Box>
  );

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Evaluación por Skill requerido de la posición
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 2.5, display: 'block' }}
      >
        Evaluá conocimientos y experiencia relacionados para cada skill
      </Typography>

      {mandatory.length > 0 && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Chip
              label="Obligatorias"
              size="small"
              color="error"
              variant="outlined"
            />
          </Box>
          <Stack spacing={2} sx={{ mb: 2.5 }}>
            {mandatory.map((skill) => renderSkillRow(skill, true))}
          </Stack>
        </>
      )}

      {desirable.length > 0 && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Chip
              label="Deseables"
              size="small"
              color="info"
              variant="outlined"
            />
          </Box>
          <Stack spacing={2} sx={{ mb: 2.5 }}>
            {desirable.map((skill) => renderSkillRow(skill, false))}
          </Stack>
        </>
      )}

      <Typography variant="h6" sx={{ mb: 1 }}>
        Evaluación General
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography sx={{ fontWeight: 600 }}>
          Nivel Técnico General{' '}
          <Typography component="span" color="error.main">
            *
          </Typography>
        </Typography>
        <Rating
          value={overall}
          onChange={(_, value) => setOverall(value || 0)}
          disabled={isSaving}
        />
      </Box>

      <TextField
        label="Decisión Recomendada"
        value={decision}
        onChange={(e) => setDecision(e.target.value)}
        fullWidth
        required
        sx={{ mb: 2 }}
        disabled={isSaving}
        error={Boolean(decision && !trimmedDecision)}
        helperText={
          decision && !trimmedDecision ? 'La decisión no puede estar vacía' : ''
        }
      />

      <TextField
        label="Comentarios y Observaciones"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        fullWidth
        required
        multiline
        minRows={4}
        sx={{ mb: 2 }}
        disabled={isSaving}
        error={Boolean(comments && !trimmedComments)}
        helperText={
          comments && !trimmedComments
            ? 'Los comentarios no pueden estar vacíos'
            : ''
        }
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || !isFormValid}
          startIcon={
            isSaving ? <CircularProgress size={16} color="inherit" /> : null
          }
        >
          {isSaving ? 'Enviando...' : 'Enviar Evaluación'}
        </Button>
      </Box>
      <AppSnackbar
        snackbar={
          errorMessage ? { message: errorMessage, severity: 'error' } : null
        }
        onClose={() => setErrorMessage('')}
      />
    </Box>
  );
}

export default TechnicalInterviewForm;
