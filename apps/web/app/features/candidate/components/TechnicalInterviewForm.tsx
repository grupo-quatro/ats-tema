import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { CandidateInterviewNote } from '../mock/candidateMock';

interface Props {
  skills: string[];
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
  skills.forEach((s) => (initialRatings[s] = 0));

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
            .map((skill) => `${skill} (${ratings[skill] || 0}/5)`)
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

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Evaluación por Skill de la JD
      </Typography>
      <Stack spacing={2} sx={{ mb: 2 }}>
        {skills.map((skill) => (
          <Box
            key={skill}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ minWidth: 200 }}>
              <Typography sx={{ fontWeight: 600 }}>{skill}</Typography>
              <Typography variant="caption" color="text.secondary">
                Evalúa conocimientos y experiencia relacionados
              </Typography>
            </Box>
            <Rating
              value={ratings[skill] || 0}
              onChange={(_, value) =>
                setRatings((current) => ({ ...current, [skill]: value || 0 }))
              }
              disabled={isSaving}
            />
          </Box>
        ))}
      </Stack>

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
