'use client';

import { useState } from 'react';
import {
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
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowLeft,
  ClipboardList,
  Clock,
  FileText,
  Info,
  Mail,
  CalendarDays,
  MoreVertical,
  Send,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { EMPLOYEE_ROLES, STAGE_CONFIG } from '@ats/shared-types';
import { STAGE_LABELS, type CandidateMockProfile } from '../mock/candidateMock';
import { getCandidateStageLabel } from '../utils/candidateProfile.utils';
import { useCandidateProfile } from '../hooks/useCandidateProfile';
import { CandidateInfoCard } from './CandidateInfoCard';
import { CommunicationHistoryCard } from './CommunicationHistoryCard';
import { FailedCommunicationsCard } from './FailedCommunicationsCard';
import { CvViewerModal } from './CvViewerModal';
import { InterviewModal } from './InterviewModal';
import { InterviewFormsModal } from './InterviewFormsModal';
import { useAuth } from '../../../shared/lib/authContext';
import { OfferManagementCard } from './OfferManagementCard';
import AppSnackbar from '@/shared/components/AppSnackbar';

interface CandidateProfileViewProps {
  candidate: CandidateMockProfile;
}

export function CandidateProfileView({ candidate }: CandidateProfileViewProps) {
  const profile = useCandidateProfile(candidate);
  const { role, callerUid } = useAuth();
  const [formsModalOpen, setFormsModalOpen] = useState(false);

  const canDoHrInterview =
    role === EMPLOYEE_ROLES.HR || role === EMPLOYEE_ROLES.ADMIN;
  const canDoTechInterview =
    role === EMPLOYEE_ROLES.AREA_LEADER ||
    role === EMPLOYEE_ROLES.TECH_LEAD ||
    role === EMPLOYEE_ROLES.ADMIN;
  const canManageOffer =
    role === EMPLOYEE_ROLES.ADMIN ||
    role === EMPLOYEE_ROLES.HR ||
    role === EMPLOYEE_ROLES.AREA_LEADER;
  const canManageCandidateStage = role === EMPLOYEE_ROLES.HR;

  const formatNoteDate = (iso: string) => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    return `${parsed.toLocaleDateString('es-AR')} ${parsed.toLocaleTimeString(
      'es-AR',
      { hour: '2-digit', minute: '2-digit' },
    )}`;
  };

  const canEditNote = (authorUid: string) =>
    Boolean(callerUid && callerUid === authorUid) || role === 'admin';
  const getInterviewNoteLabel = (text: string) => {
    const match = text.match(/^\[(Entrevista[^\]]+)\]\s*/i);
    return match?.[1] ?? 'Entrevista';
  };
  const getNoteDisplayText = (text: string) =>
    text.replace(/^\[Entrevista[^\]]+\]\s*/i, '');
  const isTerminalStage =
    profile.currentStage === STAGE_LABELS.descartado ||
    profile.currentStage === STAGE_LABELS.contratado;

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
          href="/dashboard/positions"
          startIcon={<ArrowLeft size={18} />}
          sx={{ color: 'text.secondary', mb: 3, textTransform: 'none' }}
        >
          Volver a posiciones
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

            {canDoTechInterview && (
              <Button
                variant="contained"
                onClick={() => profile.openInterviewModal('tech')}
                disabled={isTerminalStage}
                sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
              >
                Entrevista técnica
              </Button>
            )}

            {canDoHrInterview && (
              <Button
                variant="outlined"
                onClick={() => profile.openInterviewModal('hr')}
                disabled={isTerminalStage}
                sx={{ textTransform: 'none' }}
              >
                Entrevista RRHH
              </Button>
            )}

            <Button
              variant="outlined"
              onClick={() => setFormsModalOpen(true)}
              startIcon={<ClipboardList size={16} />}
              sx={{ textTransform: 'none' }}
            >
              Ver formularios
            </Button>

            {canManageCandidateStage && (
              <>
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
                      profile.pendingStages.length === 0 || isTerminalStage
                    }
                  >
                    Cambiar etapa
                  </MenuItem>
                  <Divider />
                  <MenuItem
                    onClick={profile.openRejectDialog}
                    disabled={isTerminalStage}
                    sx={{ color: 'error.main' }}
                  >
                    Rechazar candidato
                  </MenuItem>
                </Menu>
              </>
            )}
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

              {profile.realStageHistory.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Aún no hay cambios de etapa registrados.
                </Typography>
              ) : (
                <Box>
                  {profile.realStageHistory.map((entry, i) => {
                    const isLast = i === profile.realStageHistory.length - 1;
                    const isRejected = entry.stage === 'rejected';
                    const changedAt =
                      entry.changedAt instanceof Date
                        ? entry.changedAt
                        : new Date(entry.changedAt);

                    return (
                      <Box key={entry.id} sx={{ display: 'flex', gap: 1.5 }}>
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
                              bgcolor: 'white',
                              border: '2.5px solid',
                              borderColor: isRejected
                                ? 'error.main'
                                : 'primary.main',
                              boxShadow:
                                i === 0
                                  ? isRejected
                                    ? '0 0 0 3px #fee2e2'
                                    : '0 0 0 3px #dbeafe'
                                  : 'none',
                            }}
                          />
                          {!isLast && (
                            <Box
                              sx={{
                                flex: 1,
                                width: '2px',
                                bgcolor: '#e2e8f0',
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
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 13,
                                fontWeight: i === 0 ? 600 : 500,
                                color:
                                  i === 0
                                    ? isRejected
                                      ? 'error.main'
                                      : 'primary.main'
                                    : 'text.primary',
                                lineHeight: 1.4,
                              }}
                            >
                              {getCandidateStageLabel(entry.stage)}
                            </Typography>
                            {STAGE_CONFIG[entry.stage]?.transitionMode ===
                            'on_calendar_event' ? (
                              <CalendarDays
                                size={12}
                                color="#64748b"
                                aria-label="Evento del calendario"
                                style={{ flexShrink: 0 }}
                              />
                            ) : entry.stage === 'offer_sent' ||
                              STAGE_CONFIG[entry.stage]?.emailTemplateStage !==
                                null ? (
                              <Mail
                                size={12}
                                color="#64748b"
                                aria-label="Notificación por email"
                                style={{ flexShrink: 0 }}
                              />
                            ) : null}
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{ fontSize: 11, color: 'text.secondary' }}
                          >
                            {changedAt.toLocaleDateString('es-AR')}{' '}
                            {changedAt.toLocaleTimeString('es-AR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' · '}
                            {entry.changedByEmail}
                          </Typography>
                          {entry.rejectionReason && (
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: '#94a3b8',
                                lineHeight: 1.4,
                                mt: 0.25,
                              }}
                            >
                              Motivo: {entry.rejectionReason}
                            </Typography>
                          )}
                          {entry.notes && (
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: '#94a3b8',
                                lineHeight: 1.4,
                                mt: 0.25,
                              }}
                            >
                              Nota: {entry.notes}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
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
                  Matching de Skills
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
                  {candidate.fitScore === undefined
                    ? 'No disponible'
                    : `${candidate.fitScore}%`}
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
                    Skills del candidato
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

            {candidate.professionalSummary ? (
              <Card>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}
                >
                  <FileText size={16} color="#64748b" />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: 'text.secondary' }}
                  >
                    Resumen profesional
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.7, whiteSpace: 'pre-line' }}
                >
                  {candidate.professionalSummary}
                </Typography>
              </Card>
            ) : null}

            {canManageOffer ? (
              <OfferManagementCard
                applicationId={candidate.applicationId}
                candidateId={candidate.id}
                disabled={isTerminalStage}
                isMarkingHired={profile.isUpdatingStage}
                onOfferSent={profile.handleOfferSent}
                onMarkAsHired={profile.handleMarkAsHired}
              />
            ) : null}

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
                  Notas de la candidatura
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  mb: 2.5,
                  minHeight: 80,
                }}
              >
                {profile.isLoadingNotes ? (
                  <Box
                    sx={{ display: 'flex', justifyContent: 'center', py: 2 }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                ) : profile.candidacyNotes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aún no hay notas sobre esta candidatura.
                  </Typography>
                ) : (
                  profile.candidacyNotes.map((note) => {
                    const isEditing = profile.editingNoteId === note.id;
                    const isInterviewNote =
                      note.source === 'interview' ||
                      note.text.startsWith('[Entrevista');
                    const displayText = getNoteDisplayText(note.text);

                    return (
                      <Box
                        key={note.id}
                        sx={{
                          bgcolor: 'background.default',
                          borderRadius: '10px',
                          p: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.25,
                              minWidth: 0,
                            }}
                          >
                            <Box
                              sx={(theme) => ({
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                bgcolor: theme.palette.primary.light,
                                color: 'primary.main',
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
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, lineHeight: 1.3 }}
                              >
                                {note.authorName}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', lineHeight: 1.4 }}
                              >
                                {note.authorRole} ·{' '}
                                {formatNoteDate(note.createdAt)}
                                {note.createdAt !== note.updatedAt && (
                                  <>
                                    {' '}
                                    · Ultima Edición:{' '}
                                    {formatNoteDate(note.updatedAt)}
                                  </>
                                )}
                              </Typography>
                            </Box>
                          </Box>
                          {canEditNote(note.authorUid) &&
                            !isInterviewNote &&
                            !isEditing && (
                              <Button
                                size="small"
                                onClick={() => profile.startEditingNote(note)}
                                disabled={
                                  profile.isSavingEditNote ||
                                  profile.isSavingNewNote
                                }
                                sx={{ textTransform: 'none', flexShrink: 0 }}
                              >
                                Editar
                              </Button>
                            )}
                        </Box>

                        {isEditing ? (
                          <Stack spacing={1.5}>
                            <TextField
                              value={profile.editingText}
                              onChange={(e) =>
                                profile.setEditingText(e.target.value)
                              }
                              fullWidth
                              multiline
                              minRows={2}
                              disabled={profile.isSavingEditNote}
                              autoFocus
                            />
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 1,
                              }}
                            >
                              <Button
                                size="small"
                                onClick={profile.cancelEditingNote}
                                disabled={profile.isSavingEditNote}
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={profile.handleSaveEditedNote}
                                disabled={
                                  !profile.editingText.trim() ||
                                  profile.isSavingEditNote
                                }
                                startIcon={
                                  profile.isSavingEditNote ? (
                                    <CircularProgress
                                      size={14}
                                      color="inherit"
                                    />
                                  ) : null
                                }
                              >
                                {profile.isSavingEditNote
                                  ? 'Guardando...'
                                  : 'Guardar'}
                              </Button>
                            </Box>
                          </Stack>
                        ) : (
                          <Stack spacing={1}>
                            {isInterviewNote && (
                              <Chip
                                label={getInterviewNoteLabel(note.text)}
                                size="small"
                                icon={<ClipboardList size={14} />}
                                sx={{
                                  alignSelf: 'flex-start',
                                  bgcolor: 'primary.light',
                                  color: 'primary.main',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                }}
                              />
                            )}
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontSize: 13, lineHeight: 1.55 }}
                            >
                              {displayText}
                            </Typography>
                          </Stack>
                        )}
                      </Box>
                    );
                  })
                )}
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 1,
                }}
              >
                <TextField
                  placeholder="Escribí una nota sobre esta candidatura..."
                  value={profile.newCommentText}
                  onChange={(e) => profile.setNewCommentText(e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={6}
                  disabled={profile.isSavingNewNote || profile.isSavingEditNote}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      profile.handleSendComment();
                    }
                  }}
                />
                <IconButton
                  color="primary"
                  onClick={profile.handleSendComment}
                  disabled={
                    !profile.newCommentText.trim() ||
                    profile.isSavingNewNote ||
                    profile.isSavingEditNote
                  }
                  aria-label="Enviar nota"
                  sx={{ mb: 0.5 }}
                >
                  {profile.isSavingNewNote ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Send size={20} />
                  )}
                </IconButton>
              </Box>
            </Card>

            <CommunicationHistoryCard candidateId={candidate.id} />

            <FailedCommunicationsCard applicationId={candidate.applicationId} />

            {canManageCandidateStage && (
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
                    cambiar la etapa del candidato. Al cambiar a ciertas etapas
                    se activarán flujos automáticos de comunicación.
                  </Typography>
                </Box>
              </Box>
            )}
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
        applicationId={candidate.applicationId}
        candidateName={candidate.fullName}
        type={profile.interviewType}
        skills={candidate.jobSkills}
        onSave={() => profile.handleInterviewSave()}
      />

      <InterviewFormsModal
        open={formsModalOpen}
        onClose={() => setFormsModalOpen(false)}
        applicationId={candidate.applicationId}
        candidateName={candidate.fullName}
        role={role}
      />

      <Dialog
        open={canManageCandidateStage && profile.stageDialogOpen}
        onClose={() =>
          !profile.isUpdatingStage && profile.setStageDialogOpen(false)
        }
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
        open={canManageCandidateStage && profile.rejectDialogOpen}
        onClose={() =>
          !profile.isUpdatingStage && profile.setRejectDialogOpen(false)
        }
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

      <AppSnackbar
        snackbar={profile.snackbar}
        onClose={() => profile.setSnackbar(null)}
      />
    </Box>
  );
}
