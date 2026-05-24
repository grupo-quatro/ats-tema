import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Rating,
  TextField,
  Typography,
} from '@mui/material';
import type { CandidateInterviewNote } from '../mock/candidateMock';

interface Props {
  candidateName: string;
  onClose: () => void;
  onSave?: (note: CandidateInterviewNote) => void | Promise<void>;
}

export function HrInterviewForm({ /* candidateName, */ onClose, onSave }: Props) {
  const [communication, setCommunication] = useState<number>(0);
  const [teamwork, setTeamwork] = useState<number>(0);
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [decision, setDecision] = useState('');
  const [comments, setComments] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    if (!communication || !teamwork || !decision.trim()) {
      setErrorMessage(
        'Completá las calificaciones de competencias y la decisión recomendada.',
      );
      return;
    }

    setErrorMessage('');
    setIsSaving(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));

      const note: CandidateInterviewNote = {
        authorName: 'Evaluación RRHH',
        date: new Date().toLocaleDateString('es-ES'),
        rating: Math.round((communication + teamwork) / 2),
        note: [
          `Comunicación: ${communication}/5.`,
          `Trabajo en equipo: ${teamwork}/5.`,
          salaryExpectation.trim()
            ? `Expectativa salarial: ${salaryExpectation.trim()}.`
            : '',
          `Decisión: ${decision.trim()}.`,
          comments.trim(),
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
        Competencias y Fit Cultural
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 600 }}>Comunicación</Typography>
          <Typography variant="caption" color="text.secondary">
            Claridad al expresarse, escucha activa
          </Typography>
        </Box>
        <Rating
          value={communication}
          onChange={(_, value) => setCommunication(value || 0)}
          disabled={isSaving}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 600 }}>Trabajo en Equipo</Typography>
          <Typography variant="caption" color="text.secondary">
            Colaboración, adaptabilidad
          </Typography>
        </Box>
        <Rating
          value={teamwork}
          onChange={(_, value) => setTeamwork(value || 0)}
          disabled={isSaving}
        />
      </Box>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Expectativas y Decisión
      </Typography>

      <TextField
        label="Expectativa Salarial (E/año)"
        value={salaryExpectation}
        onChange={(e) => setSalaryExpectation(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
        disabled={isSaving}
      />

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
          disabled={
            isSaving || !communication || !teamwork || !decision.trim()
          }
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

export default HrInterviewForm;
