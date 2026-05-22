'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Info,
  MessageSquare,
  MoreVertical,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { STAGE_LABELS, type CandidateMockProfile } from '../mock/candidateMock';
import { CandidateInfoCard } from './CandidateInfoCard';
import { CvViewerModal } from './CvViewerModal';
import { InterviewModal } from './InterviewModal';

interface CandidateProfileViewProps {
  candidate: CandidateMockProfile;
}

export function CandidateProfileView({ candidate }: CandidateProfileViewProps) {
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewType, setInterviewType] = useState<'tech' | 'hr'>('tech');
  const [newNoteModalOpen, setNewNoteModalOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [interviewNotes, setInterviewNotes] = useState(candidate.interviewNotes);
  const [newNoteAuthor, setNewNoteAuthor] = useState('');
  const [newNoteDate, setNewNoteDate] = useState('');
  const [newNoteRating, setNewNoteRating] = useState(0);
  const [newNoteText, setNewNoteText] = useState('');

  const resetNewNoteForm = () => {
    setNewNoteAuthor('');
    setNewNoteDate('');
    setNewNoteRating(0);
    setNewNoteText('');
  };

  const openNewNoteModal = () => {
    resetNewNoteForm();
    setNewNoteModalOpen(true);
  };

  const formatDateToSpanish = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('es-ES');
  };

  const handleSaveNewNote = () => {
    const parsedDate = new Date(newNoteDate);
    if (!newNoteAuthor || !newNoteDate || !newNoteText || Number.isNaN(parsedDate.getTime())) {
      return;
    }

    setInterviewNotes((current) => [
      ...current,
      {
        authorName: newNoteAuthor,
        date: formatDateToSpanish(newNoteDate),
        rating: newNoteRating || 0,
        note: newNoteText,
      },
    ]);
    setNewNoteModalOpen(false);
    resetNewNoteForm();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="xl">
        <Button
          component={Link}
          href="/candidates"
          startIcon={<ArrowLeft size={18} />}
          sx={{ color: 'text.secondary', mb: 3, textTransform: 'none' }}
        >
          Volver a candidatos
        </Button>

        {/* Page header */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
            mb: 4,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={(theme) => ({
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: theme.palette.primary.main,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 700,
                flexShrink: 0,
              })}
            >
              {candidate.initials}
            </Box>
            <Box>
              <Typography variant="h2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {candidate.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {candidate.title}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Estado actual:
              </Typography>
              <Chip
                label={candidate.currentStage}
                size="small"
                sx={{
                  bgcolor: '#e0f2fe',
                  color: '#0369a1',
                  fontWeight: 600,
                  fontSize: 12,
                  borderRadius: '6px',
                  height: 26,
                }}
              />
            </Box>

            <Button
              variant="contained"
              onClick={() => { setInterviewType('tech'); setInterviewModalOpen(true); }}
              sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
            >
              Entrevista técnica
            </Button>

            <Button
              variant="outlined"
              onClick={() => { setInterviewType('hr'); setInterviewModalOpen(true); }}
              sx={{ textTransform: 'none' }}
            >
              Entrevista RRHH
            </Button>

            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              aria-label="Más opciones"
              size="small"
            >
              <MoreVertical size={20} />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              <MenuItem onClick={() => setMenuAnchor(null)}>Cambiar etapa</MenuItem>
              <Divider />
              <MenuItem onClick={() => setMenuAnchor(null)} sx={{ color: 'error.main' }}>
                Rechazar candidato
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Two-column layout */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '340px 1fr' },
            gap: 3,
            alignItems: 'flex-start',
          }}
        >
          {/* Left column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CandidateInfoCard candidate={candidate} onViewCv={() => setCvModalOpen(true)} />

            <Card>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <Clock size={14} color="#64748b" />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Seguimiento de la candidatura
                </Typography>
              </Box>

              <Box>
                {candidate.stageHistory.map((stage, i) => {
                  const isLast = i === candidate.stageHistory.length - 1;
                  const isCompleted = stage.status === 'completed';
                  const isCurrent = stage.status === 'current';

                  return (
                    <Box key={i} sx={{ display: 'flex', gap: 1.5 }}>
                      {/* Rail */}
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          width: 14,
                          flexShrink: 0,
                        }}
                      >
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            flexShrink: 0,
                            ...(isCompleted && { bgcolor: 'primary.main' }),
                            ...(isCurrent && {
                              bgcolor: 'white',
                              border: '2.5px solid',
                              borderColor: 'primary.main',
                              boxShadow: '0 0 0 3px #dbeafe',
                            }),
                            ...(!isCompleted && !isCurrent && {
                              bgcolor: 'white',
                              border: '2px solid #cbd5e1',
                            }),
                          }}
                        />
                        {!isLast && (
                          <Box
                            sx={{
                              flex: 1,
                              width: '2px',
                              bgcolor: isCompleted ? 'primary.main' : '#e2e8f0',
                              mt: 0.5,
                              minHeight: 20,
                            }}
                          />
                        )}
                      </Box>

                      {/* Content */}
                      <Box sx={{ pb: isLast ? 0 : 2, flex: 1, minWidth: 0 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            gap: 0.5,
                            mb: stage.description ? 0.25 : 0,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: isCurrent ? 600 : 500,
                              color: isCurrent
                                ? 'primary.main'
                                : isCompleted
                                  ? 'text.primary'
                                  : 'text.secondary',
                              lineHeight: 1.4,
                            }}
                          >
                            {STAGE_LABELS[stage.key]}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              flexShrink: 0,
                              fontSize: 11,
                              color: stage.date ? 'text.secondary' : '#cbd5e1',
                            }}
                          >
                            {stage.date ?? 'Pendiente'}
                          </Typography>
                        </Box>
                        {stage.description && (
                          <Typography sx={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
                            {stage.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Card>
          </Box>

          {/* Right column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Scoring card */}
            <Card>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Sparkles size={16} color="#64748b" />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Scoring Inicial de IA
                </Typography>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                % FIT
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 2.5 }}>
                <Typography
                  sx={{
                    fontSize: 52,
                    fontWeight: 700,
                    color: 'primary.main',
                    lineHeight: 1,
                  }}
                >
                  {candidate.fitScore}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  compatibilidad general con la posición
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 2, sm: 4 },
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, display: 'block', mb: 1 }}
                  >
                    Skills detectadas
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {candidate.detectedSkills.map((skill) => (
                      <Chip
                        key={skill}
                        label={skill}
                        size="small"
                        sx={{
                          bgcolor: '#dcfce7',
                          color: '#15803d',
                          fontWeight: 500,
                          fontSize: 12,
                          borderRadius: '6px',
                          height: 24,
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, display: 'block', mb: 1 }}
                  >
                    Gap (faltantes)
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {candidate.gapSkills.map((skill) => (
                      <Chip
                        key={skill}
                        label={skill}
                        size="small"
                        sx={{
                          bgcolor: '#fee2e2',
                          color: '#dc2626',
                          fontWeight: 500,
                          fontSize: 12,
                          borderRadius: '6px',
                          height: 24,
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            </Card>

            {/* Strengths card */}
            <Card>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 2 }}>
                Fortalezas de la candidatura
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {candidate.strengths.map((strength, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <CheckCircle2
                      size={18}
                      color="#16a34a"
                      style={{ marginTop: 1, flexShrink: 0 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {strength}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Card>

            {/* Interview notes card */}
            <Card>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MessageSquare size={16} color="#64748b" />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Notas de las entrevistas
                  </Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={openNewNoteModal}>
                  Añadir nota
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {interviewNotes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aún no hay notas de entrevistas.
                  </Typography>
                ) : (
                  interviewNotes.map((note, i) => (
                    <Box key={i}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Box
                            sx={(theme) => ({
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              bgcolor: theme.palette.primary.light,
                              color: theme.palette.primary.main,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700,
                              flexShrink: 0,
                            })}
                          >
                            {note.authorName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                              {note.authorName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {note.date}
                            </Typography>
                          </Box>
                        </Box>
                        <Rating value={note.rating} readOnly size="small" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                        {note.note}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            </Card>

            {/* Stage management info box */}
            <Box
              sx={{
                bgcolor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                p: 2.5,
                display: 'flex',
                gap: 1.5,
              }}
            >
              <Info size={18} color="#2563eb" style={{ marginTop: 2, flexShrink: 0 }} />
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}
                >
                  Gestión de Etapa
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                  Utilizá el menú de acciones (tres puntos en el header) para cambiar la etapa del
                  candidato. Al cambiar a ciertas etapas se activarán flujos automáticos de
                  comunicación.
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>

      <CvViewerModal
        open={cvModalOpen}
        onClose={() => setCvModalOpen(false)}
        cvUrl={candidate.cvMockUrl}
        candidateName={candidate.fullName}
      />

      <InterviewModal
        open={interviewModalOpen}
        onClose={() => setInterviewModalOpen(false)}
        candidateName={candidate.fullName}
        type={interviewType}
        skills={candidate.detectedSkills}
      />

      <Dialog open={newNoteModalOpen} onClose={() => setNewNoteModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Añadir nueva nota de entrevista</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, color: 'text.secondary' }}>
            Completa los datos de la nota para agregarla a la ficha del candidato.
          </DialogContentText>
          <Stack spacing={2}>
            <TextField
              label="Autor"
              value={newNoteAuthor}
              onChange={(event) => setNewNoteAuthor(event.target.value)}
              fullWidth
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Fecha
              </Typography>
              <TextField
                type="date"
                value={newNoteDate}
                onChange={(event) => setNewNoteDate(event.target.value)}
                fullWidth
                error={Boolean(newNoteDate && Number.isNaN(new Date(newNoteDate).getTime()))}
                helperText={
                  newNoteDate && Number.isNaN(new Date(newNoteDate).getTime())
                    ? 'Fecha inválida'
                    : ''
                }
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Calificación:
              </Typography>
              <Rating
                value={newNoteRating}
                onChange={(_, value) => setNewNoteRating(value || 0)}
                size="small"
              />
            </Box>
            <TextField
              label="Nota"
              value={newNoteText}
              onChange={(event) => setNewNoteText(event.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setNewNoteModalOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveNewNote}
            disabled={
              !newNoteAuthor || !newNoteDate || !newNoteText ||
              Number.isNaN(new Date(newNoteDate).getTime())
            }
          >
            Guardar nota
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
