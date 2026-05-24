'use client';

import { useCallback, useState } from 'react';
import {
  STAGE_LABELS,
  STAGE_ORDER,
  type CandidateInterviewNote,
  type CandidateMockProfile,
  type CandidateStageEntry,
  type CandidateStageKey,
} from '../mock/candidateMock';

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

export function useCandidateProfile(candidate: CandidateMockProfile) {
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewType, setInterviewType] = useState<'tech' | 'hr'>('tech');
  const [newNoteModalOpen, setNewNoteModalOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedStageKey, setSelectedStageKey] = useState<CandidateStageKey | ''>(
    '',
  );
  const [rejectReason, setRejectReason] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [showAllStrengths, setShowAllStrengths] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const [currentStage, setCurrentStage] = useState(candidate.currentStage);
  const [stageHistory, setStageHistory] = useState(candidate.stageHistory);
  const [interviewNotes, setInterviewNotes] = useState(
    candidate.interviewNotes,
  );

  const [newNoteAuthor, setNewNoteAuthor] = useState('');
  const [newNoteDate, setNewNoteDate] = useState('');
  const [newNoteRating, setNewNoteRating] = useState(0);
  const [newNoteText, setNewNoteText] = useState('');

  const pendingStages = stageHistory.filter(
    (stage) => stage.status === 'pending' && stage.key !== 'descartado',
  );

  const visibleStrengths = showAllStrengths
    ? candidate.strengths
    : candidate.strengths.slice(0, 2);

  const resetNewNoteForm = useCallback(() => {
    setNewNoteAuthor('');
    setNewNoteDate('');
    setNewNoteRating(0);
    setNewNoteText('');
  }, []);

  const openNewNoteModal = useCallback(() => {
    resetNewNoteForm();
    setNewNoteModalOpen(true);
  }, [resetNewNoteForm]);

  const openInterviewModal = useCallback((type: 'tech' | 'hr') => {
    setInterviewType(type);
    setInterviewModalOpen(true);
  }, []);

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

  const handleSaveNewNote = useCallback(async () => {
    const parsedDate = new Date(newNoteDate);
    if (
      !newNoteAuthor ||
      !newNoteDate ||
      !newNoteText ||
      Number.isNaN(parsedDate.getTime())
    ) {
      return;
    }

    setIsSavingNote(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const note: CandidateInterviewNote = {
        authorName: newNoteAuthor,
        date: formatDateToSpanish(newNoteDate),
        rating: newNoteRating || 0,
        note: newNoteText,
      };

      setInterviewNotes((current) => [...current, note]);
      setNewNoteModalOpen(false);
      resetNewNoteForm();
      setSnackbar({ message: 'Nota guardada correctamente', severity: 'success' });
    } catch {
      setSnackbar({ message: 'No se pudo guardar la nota', severity: 'error' });
    } finally {
      setIsSavingNote(false);
    }
  }, [
    newNoteAuthor,
    newNoteDate,
    newNoteRating,
    newNoteText,
    resetNewNoteForm,
  ]);

  const handleStageChange = useCallback(async () => {
    if (!selectedStageKey) return;

    setIsUpdatingStage(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setStageHistory((current) => applyStageChange(current, selectedStageKey));
      setCurrentStage(STAGE_LABELS[selectedStageKey]);
      setStageDialogOpen(false);
      setSnackbar({
        message: `Etapa actualizada a "${STAGE_LABELS[selectedStageKey]}"`,
        severity: 'success',
      });
    } catch {
      setSnackbar({ message: 'No se pudo cambiar la etapa', severity: 'error' });
    } finally {
      setIsUpdatingStage(false);
    }
  }, [selectedStageKey]);

  const handleReject = useCallback(async () => {
    if (!rejectReason.trim()) return;

    setIsUpdatingStage(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setStageHistory((current) => applyRejection(current, rejectReason.trim()));
      setCurrentStage(STAGE_LABELS.descartado);
      setRejectDialogOpen(false);
      setRejectReason('');
      setSnackbar({ message: 'Candidato rechazado', severity: 'success' });
    } catch {
      setSnackbar({ message: 'No se pudo rechazar al candidato', severity: 'error' });
    } finally {
      setIsUpdatingStage(false);
    }
  }, [rejectReason]);

  const handleInterviewSave = useCallback(
    async (note: CandidateInterviewNote) => {
      setInterviewNotes((current) => [...current, note]);
      setInterviewModalOpen(false);
      setSnackbar({
        message: 'Evaluación de entrevista registrada',
        severity: 'success',
      });
    },
    [],
  );

  return {
    cvModalOpen,
    setCvModalOpen,
    interviewModalOpen,
    setInterviewModalOpen,
    interviewType,
    newNoteModalOpen,
    setNewNoteModalOpen,
    stageDialogOpen,
    setStageDialogOpen,
    rejectDialogOpen,
    setRejectDialogOpen,
    menuAnchor,
    setMenuAnchor,
    selectedStageKey,
    setSelectedStageKey,
    rejectReason,
    setRejectReason,
    isSavingNote,
    isUpdatingStage,
    showAllStrengths,
    setShowAllStrengths,
    snackbar,
    setSnackbar,
    currentStage,
    stageHistory,
    interviewNotes,
    pendingStages,
    visibleStrengths,
    newNoteAuthor,
    setNewNoteAuthor,
    newNoteDate,
    setNewNoteDate,
    newNoteRating,
    setNewNoteRating,
    newNoteText,
    setNewNoteText,
    openNewNoteModal,
    openInterviewModal,
    openStageDialog,
    openRejectDialog,
    handleSaveNewNote,
    handleStageChange,
    handleReject,
    handleInterviewSave,
    formatDateToSpanish,
  };
}
