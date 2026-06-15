'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CandidacyNoteDTO } from '@ats/shared-types';
import {
  STAGE_LABELS,
  STAGE_ORDER,
  type CandidateMockProfile,
  type CandidateStageEntry,
  type CandidateStageKey,
} from '../mock/candidateMock';
import {
  getCandidacyNotes,
  saveCandidacyNote,
  updateCandidacyNote,
} from '@/shared/api/candidacyNotesApi';
import {
  getStageHistory,
  previewApplicationStageEmail,
  updateApplicationStage,
} from '@/shared/api/applicationsApi';
import {
  CANDIDATE_STAGE_TO_APP_STAGE,
  getAvailableRecruiterStages,
  isTerminalApplicationStage,
} from '../utils/candidateProfile.utils';
import {
  PIPELINE_ORDER,
  type ApplicationStage,
  type PreviewApplicationStageEmailResponse,
  type StageHistoryEntry,
} from '@ats/shared-types';

type SnackbarState = { message: string; severity: 'success' | 'error' } | null;

function formatDateToSpanish(value: string | Date) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('es-ES');
}

function applyStageChange(
  history: CandidateStageEntry[],
  targetKey: CandidateStageKey,
): CandidateStageEntry[] {
  const targetIndex = STAGE_ORDER.indexOf(targetKey);

  return history.map((entry) => {
    const entryIndex = STAGE_ORDER.indexOf(entry.key);
    if (entryIndex < targetIndex) {
      return { ...entry, status: 'completed' as const };
    }
    if (entryIndex === targetIndex) {
      return {
        ...entry,
        status: 'current' as const,
        date: formatDateToSpanish(new Date()),
      };
    }
    return { ...entry, status: 'pending' as const };
  });
}

function applyRejection(
  history: CandidateStageEntry[],
  reason: string,
): CandidateStageEntry[] {
  const updated = history.map((entry) =>
    entry.status === 'current'
      ? { ...entry, status: 'completed' as const }
      : entry,
  );

  const hasDiscarded = updated.some((entry) => entry.key === 'descartado');
  if (hasDiscarded) {
    return updated.map((entry) =>
      entry.key === 'descartado'
        ? {
            ...entry,
            status: 'current' as const,
            date: formatDateToSpanish(new Date()),
            description: reason,
            discardReason: reason,
          }
        : entry,
    );
  }

  return [
    ...updated,
    {
      key: 'descartado' as const,
      status: 'current' as const,
      date: formatDateToSpanish(new Date()),
      description: reason,
      discardReason: reason,
    },
  ];
}

function toVisibleStageHistory(
  history: StageHistoryEntry[],
): StageHistoryEntry[] {
  return history.filter((entry) => entry.stage !== 'profile_pending');
}

export function useCandidateProfile(candidate: CandidateMockProfile) {
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewType, setInterviewType] = useState<'tech' | 'hr'>('tech');
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [stageEmailPreviewOpen, setStageEmailPreviewOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedStageKey, setSelectedStageKey] = useState<
    CandidateStageKey | ''
  >('');
  const [rejectReason, setRejectReason] = useState('');
  const [isSavingNewNote, setIsSavingNewNote] = useState(false);
  const [isSavingEditNote, setIsSavingEditNote] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [isPreviewingStageEmail, setIsPreviewingStageEmail] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const [stageEmailPreview, setStageEmailPreview] =
    useState<PreviewApplicationStageEmailResponse | null>(null);

  const [currentStage, setCurrentStage] = useState(candidate.currentStage);
  const [stageHistory, setStageHistory] = useState(candidate.stageHistory);
  const [realStageHistory, setRealStageHistory] = useState<StageHistoryEntry[]>(
    [],
  );
  const [candidacyNotes, setCandidacyNotes] = useState<CandidacyNoteDTO[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const loadCandidacyNotes = useCallback(async () => {
    if (!candidate.applicationId) return;
    setIsLoadingNotes(true);
    try {
      const notes = await getCandidacyNotes(candidate.applicationId);
      setCandidacyNotes(notes);
    } catch {
      setSnackbar({
        message: 'No se pudieron cargar las notas',
        severity: 'error',
      });
    } finally {
      setIsLoadingNotes(false);
    }
  }, [candidate.applicationId]);

  const refreshStageHistory = useCallback(async () => {
    if (!candidate.applicationId) return;
    const history = await getStageHistory(candidate.applicationId);
    setRealStageHistory(toVisibleStageHistory(history));
  }, [candidate.applicationId]);

  useEffect(() => {
    if (!candidate.applicationId) return;
    refreshStageHistory().catch(() => {});
    loadCandidacyNotes();
  }, [candidate.applicationId, loadCandidacyNotes, refreshStageHistory]);

  const currentApplicationStage: ApplicationStage | null = (() => {
    if (realStageHistory.length > 0) {
      return realStageHistory[realStageHistory.length - 1]?.stage ?? null;
    }
    const currentEntry = stageHistory.find((s) => s.status === 'current');
    if (!currentEntry) return null;
    return CANDIDATE_STAGE_TO_APP_STAGE[currentEntry.key] ?? null;
  })();

  const pendingStages = getAvailableRecruiterStages(currentApplicationStage);
  const isTerminalStage =
    isTerminalApplicationStage(currentApplicationStage) ||
    currentStage === STAGE_LABELS.contratado ||
    currentStage === STAGE_LABELS.descartado;
  const canManageNotes = !isTerminalStage;

  // Determina el número de entrevista correcto según el tipo (hr o tech).
  // Para RRHH: es la segunda si el stage actual ya superó hr_1_done en el pipeline.
  // Para técnica: es la segunda si el stage actual ya superó tech_1_done en the pipeline.
  // Se resuelve en tiempo de apertura del modal usando interviewType.
  const interviewNumber: 1 | 2 = (() => {
    if (!currentApplicationStage) return 1;
    const pipelineIdx = PIPELINE_ORDER.indexOf(currentApplicationStage);
    const threshold =
      interviewType === 'hr'
        ? PIPELINE_ORDER.indexOf('hr_1_done')
        : PIPELINE_ORDER.indexOf('tech_1_done');
    return pipelineIdx > threshold ? 2 : 1;
  })();

  const openInterviewModal = useCallback(
    (type: 'tech' | 'hr') => {
      if (isTerminalStage) return;
      setInterviewType(type);
      setInterviewModalOpen(true);
    },
    [isTerminalStage],
  );

  const openStageDialog = useCallback(() => {
    setSelectedStageKey(pendingStages[0]?.key ?? '');
    setStageDialogOpen(true);
    setMenuAnchor(null);
  }, [pendingStages]);

  const openRejectDialog = useCallback(() => {
    setRejectReason('');
    setRejectDialogOpen(true);
    setMenuAnchor(null);
  }, []);

  const handleSendComment = useCallback(async () => {
    const text = newCommentText.trim();
    if (!text || !candidate.applicationId || !canManageNotes) return;

    setIsSavingNewNote(true);
    try {
      await saveCandidacyNote({
        applicationId: candidate.applicationId,
        text,
      });
      setNewCommentText('');
      await loadCandidacyNotes();
      setSnackbar({
        message: 'Nota agregada correctamente',
        severity: 'success',
      });
    } catch {
      setSnackbar({ message: 'No se pudo guardar la nota', severity: 'error' });
    } finally {
      setIsSavingNewNote(false);
    }
  }, [
    newCommentText,
    candidate.applicationId,
    loadCandidacyNotes,
    canManageNotes,
  ]);

  const startEditingNote = useCallback(
    (note: CandidacyNoteDTO) => {
      if (!canManageNotes) return;
      setEditingNoteId(note.id);
      setEditingText(note.text);
    },
    [canManageNotes],
  );

  const cancelEditingNote = useCallback(() => {
    setEditingNoteId(null);
    setEditingText('');
  }, []);

  const handleSaveEditedNote = useCallback(async () => {
    const text = editingText.trim();
    if (
      !text ||
      !editingNoteId ||
      !candidate.applicationId ||
      !canManageNotes
    ) {
      return;
    }

    const noteId = editingNoteId;
    const previousNotes = candidacyNotes;

    setCandidacyNotes((current) =>
      current.map((note) => (note.id === noteId ? { ...note, text } : note)),
    );
    setIsSavingEditNote(true);

    try {
      const updated = await updateCandidacyNote({
        applicationId: candidate.applicationId,
        id: noteId,
        text,
      });

      setCandidacyNotes((current) =>
        current.map((note) => (note.id === updated.id ? updated : note)),
      );
      setEditingNoteId(null);
      setEditingText('');
      setSnackbar({
        message: 'Nota actualizada correctamente',
        severity: 'success',
      });
    } catch {
      setCandidacyNotes(previousNotes);
      setSnackbar({
        message: 'No se pudo actualizar la nota',
        severity: 'error',
      });
    } finally {
      setIsSavingEditNote(false);
    }
  }, [
    editingText,
    editingNoteId,
    candidate.applicationId,
    candidacyNotes,
    canManageNotes,
  ]);

  const handlePreviewStageChange = useCallback(async () => {
    if (!selectedStageKey) return;

    setIsPreviewingStageEmail(true);
    try {
      const preview = await previewApplicationStageEmail({
        applicationId: candidate.applicationId,
        stage: CANDIDATE_STAGE_TO_APP_STAGE[selectedStageKey],
      });

      setStageEmailPreview(preview);
      setStageDialogOpen(false);
      setStageEmailPreviewOpen(true);
    } catch {
      setSnackbar({
        message: 'No se pudo previsualizar el email',
        severity: 'error',
      });
    } finally {
      setIsPreviewingStageEmail(false);
    }
  }, [selectedStageKey, candidate.applicationId]);

  const handleStageChange = useCallback(async () => {
    if (!selectedStageKey) return;

    setIsUpdatingStage(true);
    try {
      let targetStage: ApplicationStage;

      if (
        selectedStageKey === 'avanza_siguiente' ||
        selectedStageKey === 'avanza_considera'
      ) {
        const nextStage = getAvailableRecruiterStages(
          currentApplicationStage,
        )?.[0];
        if (!nextStage) {
          setSnackbar({
            message: 'No hay siguiente etapa disponible',
            severity: 'error',
          });
          setIsUpdatingStage(false);
          return;
        }
        targetStage = CANDIDATE_STAGE_TO_APP_STAGE[nextStage.key];
      } else if (selectedStageKey === 'no_avanza_rechazado') {
        targetStage = 'rejected';
      } else {
        targetStage = CANDIDATE_STAGE_TO_APP_STAGE[selectedStageKey];
      }

      await updateApplicationStage({
        applicationId: candidate.applicationId,
        stage: targetStage,
      });

      setStageHistory((current) => applyStageChange(current, selectedStageKey));
      setCurrentStage(STAGE_LABELS[selectedStageKey]);
      setStageEmailPreviewOpen(false);
      setStageEmailPreview(null);
      setSelectedStageKey('');
      setSnackbar({
        message: stageEmailPreview?.hasEmail
          ? 'Se cambio de etapa y se envio el correo'
          : `Etapa actualizada a "${STAGE_LABELS[selectedStageKey]}"`,
        severity: 'success',
      });
      refreshStageHistory().catch(() => {});
    } catch {
      setSnackbar({
        message: 'No se pudo cambiar la etapa',
        severity: 'error',
      });
    } finally {
      setIsUpdatingStage(false);
    }
  }, [
    selectedStageKey,
    candidate.applicationId,
    refreshStageHistory,
    stageEmailPreview?.hasEmail,
    currentApplicationStage,
  ]);

  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) return;

    setIsUpdatingStage(true);
    try {
      await updateApplicationStage({
        applicationId: candidate.applicationId,
        stage: 'rejected',
        rejectionReason: rejectReason.trim(),
      });

      setStageHistory((current) =>
        applyRejection(current, rejectReason.trim()),
      );
      setCurrentStage(STAGE_LABELS.descartado);
      setRejectDialogOpen(false);
      setRejectReason('');
      setSnackbar({ message: 'Candidato rechazado', severity: 'success' });
      refreshStageHistory().catch(() => {});
    } catch {
      setSnackbar({
        message: 'No se pudo rechazar al candidato',
        severity: 'error',
      });
    } finally {
      setIsUpdatingStage(false);
    }
  }, [rejectReason, candidate.applicationId, refreshStageHistory]);

  const handleOfferSent = useCallback(() => {
    setStageHistory((current) => applyStageChange(current, 'oferta_enviada'));
    setCurrentStage(STAGE_LABELS.oferta_enviada);
    refreshStageHistory().catch(() => {});
  }, [refreshStageHistory]);

  const handleMarkAsHired = useCallback(async () => {
    setIsUpdatingStage(true);
    try {
      await updateApplicationStage({
        applicationId: candidate.applicationId,
        stage: 'hired',
        notes:
          'Oferta aceptada por el candidato. Contratación confirmada por RR.HH.',
      });

      setStageHistory((current) => applyStageChange(current, 'contratado'));
      setCurrentStage(STAGE_LABELS.contratado);
      setSnackbar({
        message: 'Candidato marcado como contratado',
        severity: 'success',
      });
      refreshStageHistory().catch(() => {});
    } catch {
      setSnackbar({
        message: 'No se pudo marcar al candidato como contratado',
        severity: 'error',
      });
    } finally {
      setIsUpdatingStage(false);
    }
  }, [candidate.applicationId, refreshStageHistory]);

  const handleInterviewSave = useCallback(async () => {
    setInterviewModalOpen(false);
    await loadCandidacyNotes();
    setSnackbar({
      message: 'Evaluación de entrevista registrada',
      severity: 'success',
    });
  }, [loadCandidacyNotes]);

  return {
    cvModalOpen,
    setCvModalOpen,
    interviewModalOpen,
    setInterviewModalOpen,
    interviewType,
    stageDialogOpen,
    setStageDialogOpen,
    stageEmailPreviewOpen,
    setStageEmailPreviewOpen,
    rejectDialogOpen,
    setRejectDialogOpen,
    menuAnchor,
    setMenuAnchor,
    selectedStageKey,
    setSelectedStageKey,
    rejectReason,
    setRejectReason,
    isSavingNewNote,
    isSavingEditNote,
    isLoadingNotes,
    isUpdatingStage,
    isPreviewingStageEmail,
    snackbar,
    setSnackbar,
    currentStage,
    stageHistory,
    realStageHistory,
    candidacyNotes,
    stageEmailPreview,
    pendingStages,
    newCommentText,
    setNewCommentText,
    editingNoteId,
    editingText,
    setEditingText,
    openInterviewModal,
    openStageDialog,
    openRejectDialog,
    handleSendComment,
    startEditingNote,
    cancelEditingNote,
    handleSaveEditedNote,
    handlePreviewStageChange,
    handleStageChange,
    handleReject,
    handleOfferSent,
    handleMarkAsHired,
    handleInterviewSave,
    formatDateToSpanish,
    interviewNumber,
    currentApplicationStage,
    canManageNotes,
    isTerminalStage,
  };
}
