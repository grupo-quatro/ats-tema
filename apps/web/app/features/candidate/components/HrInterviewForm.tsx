import React, { useState } from 'react';
import { Box, Button, Rating, TextField, Typography } from '@mui/material';

interface Props {
  candidateName: string;
  onClose: () => void;
}

export function HrInterviewForm({ candidateName, onClose }: Props) {
  const [communication, setCommunication] = useState<number>(0);
  const [teamwork, setTeamwork] = useState<number>(0);
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [decision, setDecision] = useState('');
  const [comments, setComments] = useState('');

  const handleSave = () => {
    const payload = { communication, teamwork, salaryExpectation, decision, comments, candidateName };
    // TODO: enviar al backend
    console.log('HR interview save', payload);
    onClose();
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Competencias y Fit Cultural</Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 600 }}>Comunicación</Typography>
          <Typography variant="caption" color="text.secondary">Claridad al expresarse, escucha activa</Typography>
        </Box>
        <Rating value={communication} onChange={(_, value) => setCommunication(value || 0)} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 600 }}>Trabajo en Equipo</Typography>
          <Typography variant="caption" color="text.secondary">Colaboración, adaptabilidad</Typography>
        </Box>
        <Rating value={teamwork} onChange={(_, value) => setTeamwork(value || 0)} />
      </Box>

      <Typography variant="h6" sx={{ mb: 1 }}>Expectativas y Decisión</Typography>

      <TextField
        label="Expectativa Salarial (E/año)"
        value={salaryExpectation}
        onChange={(e) => setSalaryExpectation(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />

      <TextField
        label="Decisión Recomendada"
        value={decision}
        onChange={(e) => setDecision(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />

      <TextField
        label="Comentarios y Observaciones"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        fullWidth
        multiline
        minRows={4}
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onClose}>Guardar Borrador</Button>
        <Button variant="contained" onClick={handleSave}>Enviar Evaluación</Button>
      </Box>
    </Box>
  );
}

export default HrInterviewForm;
