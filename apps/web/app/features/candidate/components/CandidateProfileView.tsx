'use client';

import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  Rating,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  MessageSquare,
  MoreVertical,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { STAGE_LABELS, type CandidateMockProfile } from '../mock/candidateMock';
import { useCandidateProfile } from '../hooks/useCandidateProfile';
import { CandidateInfoCard } from './CandidateInfoCard';
import { CvViewerModal } from './CvViewerModal';
import { InterviewModal } from './InterviewModal';

interface CandidateProfileViewProps {
  candidate: CandidateMockProfile;
}

export function CandidateProfileView({ candidate }: CandidateProfileViewProps) {
  const profile = useCandidateProfile(candidate);

  const isNewNoteInvalid =
    !profile.newNoteAuthor ||
    !profile.newNoteDate ||
    !profile.newNoteText ||
    Number.isNaN(new Date(profile.newNoteDate).getTime());

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="xl">
        <Button
          component={Link}
          href="/dashboard/candidates"
          startIcon={<ArrowLeft size={18} />}
          sx={{ color: 'text.secondary', mb: 3, textTransform: 'none' }}
        >
          Volver a candidatos
        </Button>

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
              <Typography
                variant="h2"
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                {candidate.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {candidate.title}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                Estado actual:
              </Typography>
              <Chip
                label={profile.currentStage}
                size="small"
                sx={{
                  bgcolor:
                    profile.currentStage === STAGE_LABELS.descartado
                      ? '#fee2e2'
                      : '#e0f2fe',
                  color:
                    profile.currentStage === STAGE_LABELS.descartado
                      ? '#dc2626'
                      : '#0369a1',
                  fontWeight: 600,
                  fontSize: 12,
                  borderRadius: '6px',
                  height: 26,
                }}
              />
            </Box>

            <Button
              variant="contained"
              onClick={() => profile.openInterviewModal('tech')}
              disabled={profile.currentStage === STAGE_LABELS.descartado}
              sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
            >
              Entrevista técnica
            </Button>

            <Button
              variant="outlined"
              onClick={() => profile.openInterviewModal('hr')}
              disabled={profile.currentStage === STAGE_LABELS.descartado}
              sx={{ textTransform: 'none' }}
            >
              Entrevista RRHH
            </Button>

            <IconButton
              onClick={(e) => profile.setMenuAnchor(e.currentTarget)}
              aria-label="Más opciones"
              size="small"
            >
              <MoreVertical size={20} />
            </IconButton>
            <Menu
              anchorEl={profile.menuAnchor}
              open={Boolean(profile.menuAnchor)}
              onClose={() => profile.setMenuAnchor(null)}
            >
              <MenuItem
                onClick={profile.openStageDialog}
                disabled={
                  profile.pendingStages.length === 0 ||
                  profile.currentStage === STAGE_LABELS.descartado
                }
              >
                Cambiar etapa
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={profile.openRejectDialog}
                disabled={profile.currentStage === STAGE_LABELS.descartado}
                sx={{ color: 'error.main' }}
              >
                Rechazar candidato
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '340px 1fr' },
            gap: 3,
            alignItems: 'flex-start',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <CandidateInfoCard
              candidate={candidate}
              onViewCv={() => profile.setCvModalOpen(true)}
            />

            <Card>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}
              >
                <Clock size={14} color="#64748b" />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: 'text.secondary' }}
                >
                  Seguimiento de la candidatura
                </Typography>
              </Box>

              <Box>
                {profile.stageHistory.map((stage, i) => {
                  const isLast = i === profile.stageHistory.length - 1;
                  const isCompleted = stage.status === 'completed';
                  const isCurrent = stage.status === 'current';

                  return (
                    <Box key={stage.key} sx={{ display: 'flex', gap: 1.5 }}>
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
                              borderColor:
                                stage.key === 'descartado'
                                  ? 'error.main'
                                  : 'primary.main',
                              boxShadow:
                                stage.key === 'descartado'
                                  ? '0 0 0 3px #fee2e2'
                                  : '0 0 0 3px #dbeafe',
                            }),
                            ...(!isCompleted &&
                              !isCurrent && {
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
                                ? stage.key === 'descartado'
                                  ? 'error.main'
                                  : 'primary.main'
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
                          <Typography
                            sx={{
                              fontSize: 11,
                              color: '#94a3b8',
                              lineHeight: 1.4,
                            }}
                          >
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

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
              >
                <Sparkles size={16} color="#64748b" />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: 'text.secondary' }}
                >
                  Scoring Inicial de IA
                </Typography>
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.25 }}
              >
                % FIT
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 1.5,
                  mb: 2.5,
                }}
              >
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

            <Card>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: 'text.secondary' }}
                >
                  Fortalezas de la candidatura
                </Typography>
                {candidate.strengths.length > 2 && (
                  <Button
                    size="small"
                    onClick={() =>
                      profile.setShowAllStrengths((current) => !current)
                    }
                    endIcon={
                      profile.showAllStrengths ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )
                    }
                    sx={{ textTransform: 'none' }}
                  >
                    {profile.showAllStrengths ? 'Ver menos' : 'Ver más'}
                  </Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {profile.visibleStrengths.map((strength, i) => (
                  <Box
                    key={i}
                    sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}
                  >
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

            <Card>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  mb: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MessageSquare size={16} color="#64748b" />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: 'text.secondary' }}
                  >
                    Notas de las entrevistas
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={profile.openNewNoteModal}
                >
                  Añadir nota
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {profile.interviewNotes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aún no hay notas de entrevistas.
                  </Typography>
                ) : (
                  profile.interviewNotes.map((note, i) => (
                    <Box key={`${note.authorName}-${note.date}-${i}`}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.25,
                          }}
                        >
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
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, lineHeight: 1.3 }}
                            >
                              {note.authorName}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {note.date}
                            </Typography>
                          </Box>
                        </Box>
                        <Rating value={note.rating} readOnly size="small" />
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: 13 }}
                      >
                        {note.note}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            </Card>

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
              <Info
                size={18}
                color="#2563eb"
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}
                >
                  Gestión de Etapa
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: 13 }}
                >
                  Utilizá el menú de acciones (tres puntos en el header) para
                  cambiar la etapa del candidato. Al cambiar a ciertas etapas se
                  activarán flujos automáticos de comunicación.
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>

      <CvViewerModal
        open={profile.cvModalOpen}
        onClose={() => profile.setCvModalOpen(false)}
        cvUrl={candidate.cvMockUrl}
        candidateName={candidate.fullName}
      />

      <InterviewModal
        open={profile.interviewModalOpen}
        onClose={() => profile.setInterviewModalOpen(false)}
        candidateName={candidate.fullName}
        type={profile.interviewType}
        skills={candidate.detectedSkills}
        onSave={profile.handleInterviewSave}
      />

      <Dialog
        open={profile.newNoteModalOpen}
        onClose={() => !profile.isSavingNote && profile.setNewNoteModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Añadir nueva nota de entrevista</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, color: 'text.secondary' }}>
            Completa los datos de la nota para agregarla a la ficha del
            candidato.
          </DialogContentText>
          <Stack spacing={2}>
            <TextField
              label="Autor"
              value={profile.newNoteAuthor}
              onChange={(event) => profile.setNewNoteAuthor(event.target.value)}
              fullWidth
              disabled={profile.isSavingNote}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Fecha
              </Typography>
              <TextField
                type="date"
                value={profile.newNoteDate}
                onChange={(event) => profile.setNewNoteDate(event.target.value)}
                fullWidth
                disabled={profile.isSavingNote}
                error={Boolean(
                  profile.newNoteDate &&
                    Number.isNaN(new Date(profile.newNoteDate).getTime()),
                )}
                helperText={
                  profile.newNoteDate &&
                  Number.isNaN(new Date(profile.newNoteDate).getTime())
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
                value={profile.newNoteRating}
                onChange={(_, value) => profile.setNewNoteRating(value || 0)}
                size="small"
                disabled={profile.isSavingNote}
              />
            </Box>
            <TextField
              label="Nota"
              value={profile.newNoteText}
              onChange={(event) => profile.setNewNoteText(event.target.value)}
              fullWidth
              multiline
              minRows={3}
              disabled={profile.isSavingNote}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => profile.setNewNoteModalOpen(false)}
            disabled={profile.isSavingNote}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={profile.handleSaveNewNote}
            disabled={isNewNoteInvalid || profile.isSavingNote}
            startIcon={
              profile.isSavingNote ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
          >
            {profile.isSavingNote ? 'Guardando...' : 'Guardar nota'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={profile.stageDialogOpen}
        onClose={() => !profile.isUpdatingStage && profile.setStageDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cambiar etapa del candidato</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, color: 'text.secondary' }}>
            Seleccioná la siguiente etapa del proceso de selección.
          </DialogContentText>
          <RadioGroup
            value={profile.selectedStageKey}
            onChange={(event) =>
              profile.setSelectedStageKey(
                event.target.value as typeof profile.selectedStageKey,
              )
            }
          >
            {profile.pendingStages.map((stage) => (
              <FormControlLabel
                key={stage.key}
                value={stage.key}
                control={<Radio disabled={profile.isUpdatingStage} />}
                label={STAGE_LABELS[stage.key]}
              />
            ))}
          </RadioGroup>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => profile.setStageDialogOpen(false)}
            disabled={profile.isUpdatingStage}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={profile.handleStageChange}
            disabled={!profile.selectedStageKey || profile.isUpdatingStage}
            startIcon={
              profile.isUpdatingStage ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
          >
            {profile.isUpdatingStage ? 'Actualizando...' : 'Confirmar cambio'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={profile.rejectDialogOpen}
        onClose={() => !profile.isUpdatingStage && profile.setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Rechazar candidato</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, color: 'text.secondary' }}>
            Indicá el motivo del rechazo. Esta acción actualizará el timeline de
            la candidatura.
          </DialogContentText>
          <TextField
            label="Motivo del rechazo"
            value={profile.rejectReason}
            onChange={(event) => profile.setRejectReason(event.target.value)}
            fullWidth
            multiline
            minRows={3}
            disabled={profile.isUpdatingStage}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => profile.setRejectDialogOpen(false)}
            disabled={profile.isUpdatingStage}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={profile.handleReject}
            disabled={!profile.rejectReason.trim() || profile.isUpdatingStage}
            startIcon={
              profile.isUpdatingStage ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
          >
            {profile.isUpdatingStage ? 'Procesando...' : 'Confirmar rechazo'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(profile.snackbar)}
        autoHideDuration={3000}
        onClose={() => profile.setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {profile.snackbar ? (
          <Alert
            severity={profile.snackbar.severity}
            onClose={() => profile.setSnackbar(null)}
          >
            {profile.snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
