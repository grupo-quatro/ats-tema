import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Rating,
  TextField,
  Typography,
} from '@mui/material';
import { saveCandidacyNote } from '../../../shared/api/candidacyNotesApi';
import { saveInterviewForm } from '../../../shared/api/interviewFormsApi';
import AppSnackbar from '@/shared/components/AppSnackbar';

interface Props {
  applicationId: string;
  onClose: () => void;
  onSave?: () => void | Promise<void>;
}

export function HrInterviewForm({ applicationId, onClose, onSave }: Props) {
  const [communication, setCommunication] = useState<number>(0);
  const [teamwork, setTeamwork] = useState<number>(0);
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [decision, setDecision] = useState('');
  const [comments, setComments] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const trimmedComments = comments.trim();
  const trimmedDecision = decision.trim();
  const trimmedSalaryExpectation = salaryExpectation.trim();
  const isFormValid =
    communication >= 1 &&
    teamwork >= 1 &&
    trimmedSalaryExpectation.length > 0 &&
    trimmedDecision.length > 0 &&
    trimmedComments.length > 0;

  const handleSave = async () => {
    if (!communication || !teamwork) {
      setErrorMessage('Calificá comunicación y trabajo en equipo (1 a 5).');
      return;
    }

    if (!trimmedSalaryExpectation) {
      setErrorMessage('La expectativa salarial es obligatoria.');
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
      const overallRating = Math.round((communication + teamwork) / 2);

      await saveInterviewForm({
        applicationId,
        type: 'hr',
        title: 'Evaluación RRHH – Entrevista',
        overallRating,
        decision: trimmedDecision,
        questions: [
          {
            question: 'Comunicación y claridad al expresarse',
            answer: 'Evaluación registrada en entrevista.',
            rating: communication,
          },
          {
            question: 'Trabajo en equipo y adaptabilidad',
            answer: 'Evaluación registrada en entrevista.',
            rating: teamwork,
          },
          {
            question: 'Expectativa salarial',
            answer: trimmedSalaryExpectation,
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
        text: trimmedComments,
        source: 'interview',
      });

      await onSave?.();
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
          <Typography sx={{ fontWeight: 600 }}>
            Comunicación{' '}
            <Typography component="span" color="error.main">
              *
            </Typography>
          </Typography>
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
          <Typography sx={{ fontWeight: 600 }}>
            Trabajo en Equipo{' '}
            <Typography component="span" color="error.main">
              *
            </Typography>
          </Typography>
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
        required
        sx={{ mb: 2 }}
        disabled={isSaving}
        error={Boolean(salaryExpectation && !trimmedSalaryExpectation)}
        helperText={
          salaryExpectation && !trimmedSalaryExpectation
            ? 'La expectativa salarial no puede estar vacía'
            : ''
        }
      />

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

export default HrInterviewForm;
