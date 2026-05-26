import React, { useState } from 'react';
import {
  Alert,
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
import type { CandidateInterviewNote } from '../mock/candidateMock';

interface Props {
  skills: Skill[];
  candidateName: string;
  onClose: () => void;
  onSave?: (note: CandidateInterviewNote) => void | Promise<void>;
}

export function TechnicalInterviewForm({
  skills,
  // candidateName,
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

  const handleSave = async () => {
    if (!overall || !decision.trim()) {
      setErrorMessage(
        'Completá la calificación general y la decisión recomendada.',
      );
      return;
    }

    setErrorMessage('');
    setIsSaving(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));

      const note: CandidateInterviewNote = {
        authorName: 'Evaluación técnica',
        date: new Date().toLocaleDateString('es-ES'),
        rating: overall,
        note: [
          `Decisión: ${decision.trim()}.`,
          comments.trim(),
          `Skills evaluadas: ${skills
            .map((skill) => `${skill.name} (${ratings[skill.name] || 0}/5)`)
            .join(', ')}.`,
        ]
          .filter(Boolean)
          .join(' '),
      };

      await onSave?.(note);
      onClose();
    } catch {
      setErrorMessage('No se pudo guardar la evaluación.');
    } finally {
      setIsSaving(false);
    }
  };

  const mandatory = skills.filter((s) => s.type === 'mandatory');
  const desirable = skills.filter((s) => s.type === 'desirable');

  const renderSkillRow = (skill: Skill) => (
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
            {mandatory.map(renderSkillRow)}
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
            {desirable.map(renderSkillRow)}
          </Stack>
        </>
      )}

      <Typography variant="h6" sx={{ mb: 1 }}>
        Evaluación General
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography sx={{ fontWeight: 600 }}>Nivel Técnico General</Typography>
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
        sx={{ mb: 2 }}
        disabled={isSaving}
      />

      <TextField
        label="Comentarios y Observaciones"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        fullWidth
        multiline
        minRows={4}
        sx={{ mb: 2 }}
        disabled={isSaving}
      />

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || !overall || !decision.trim()}
          startIcon={
            isSaving ? <CircularProgress size={16} color="inherit" /> : null
          }
        >
          {isSaving ? 'Enviando...' : 'Enviar Evaluación'}
        </Button>
      </Box>
    </Box>
  );
}

export default TechnicalInterviewForm;
