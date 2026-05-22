import React, { useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Rating } from '@mui/material';

interface Props {
  skills: string[];
  candidateName: string;
  onClose: () => void;
}

export function TechnicalInterviewForm({ skills, candidateName, onClose }: Props) {
  const initialRatings: Record<string, number> = {};
  skills.forEach((s) => (initialRatings[s] = 0));

  const [ratings, setRatings] = useState<Record<string, number>>(initialRatings);
  const [overall, setOverall] = useState<number>(0);
  const [decision, setDecision] = useState('');
  const [comments, setComments] = useState('');

  const handleSave = () => {
    const payload = { ratings, overall, decision, comments, candidateName };
    // TODO: enviar a backend. Por ahora sólo cierre.
    console.log('Technical interview save', payload);
    onClose();
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Evaluación por Skill de la JD</Typography>
      <Stack spacing={2} sx={{ mb: 2 }}>
        {skills.map((skill) => (
          <Box key={skill} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ minWidth: 200 }}>
              <Typography sx={{ fontWeight: 600 }}>{skill}</Typography>
              <Typography variant="caption" color="text.secondary">Evalúa conocimientos y experiencia relacionados</Typography>
            </Box>
            <Rating
              value={ratings[skill] || 0}
              onChange={(_, value) => setRatings((c) => ({ ...c, [skill]: value || 0 }))}
            />
          </Box>
        ))}
      </Stack>

      <Typography variant="h6" sx={{ mb: 1 }}>Evaluación General</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography sx={{ fontWeight: 600 }}>Nivel Técnico General</Typography>
        <Rating value={overall} onChange={(_, value) => setOverall(value || 0)} />
      </Box>

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
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>Enviar Evaluación</Button>
      </Box>
    </Box>
  );
}

export default TechnicalInterviewForm;
