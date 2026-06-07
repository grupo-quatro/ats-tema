'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  STAGE_LABELS,
  STAGE_ORDER,
  type CandidateInterviewNote,
  type CandidateMockProfile,
  type CandidateStageEntry,
  type CandidateStageKey,
} from '../mock/candidateMock';
import {
  getStageHistory,
  updateApplicationStage,
} from '@/shared/api/applicationsApi';
import { CANDIDATE_STAGE_TO_APP_STAGE } from '../utils/candidateProfile.utils';
import {
  PIPELINE_ORDER,
  STAGE_CONFIG,
  isValidTransition,
  type ApplicationStage,
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

export function useCandidateProfile(candidate: CandidateMockProfile) {
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewType, setInterviewType] = useState<'tech' | 'hr'>('tech');
  const [newNoteModalOpen, setNewNoteModalOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedStageKey, setSelectedStageKey] = useState<
    CandidateStageKey | ''
  >('');
  const [rejectReason, setRejectReason] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [showAllStrengths, setShowAllStrengths] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

  const [currentStage, setCurrentStage] = useState(candidate.currentStage);
  const [stageHistory, setStageHistory] = useState(candidate.stageHistory);
  const [realStageHistory, setRealStageHistory] = useState<StageHistoryEntry[]>(
    [],
  );
  const [interviewNotes, setInterviewNotes] = useState(
    candidate.interviewNotes,
  );

  const [newNoteAuthor, setNewNoteAuthor] = useState('');
  const [newNoteDate, setNewNoteDate] = useState('');
  const [newNoteRating, setNewNoteRating] = useState(0);
  const [newNoteText, setNewNoteText] = useState('');

  useEffect(() => {
    if (!candidate.applicationId) return;
    getStageHistory(candidate.applicationId)
      .then(setRealStageHistory)
      .catch(() => {});
  }, [candidate.applicationId]);

  // ApplicationStage real del stage actual (para validar transiciones y calcular interviewNumber)
  const currentApplicationStage: ApplicationStage | null = (() => {
    const currentEntry = stageHistory.find((s) => s.status === 'current');
    if (!currentEntry) return null;
    return CANDIDATE_STAGE_TO_APP_STAGE[currentEntry.key] ?? null;
  })();

  // Filtra solo stages que el recruiter puede seleccionar manualmente:
  // transitionMode === 'recruiter_action' y transición válida desde el stage actual
  const pendingStages = stageHistory.filter((stage) => {
    if (stage.status !== 'pending' || stage.key === 'descartado') return false;
    const appStage = CANDIDATE_STAGE_TO_APP_STAGE[stage.key] as
      | ApplicationStage
      | undefined;
    if (!appStage) return false;
    if (STAGE_CONFIG[appStage]?.transitionMode !== 'recruiter_action')
      return false;
    if (!currentApplicationStage) return false;
    return isValidTransition(currentApplicationStage, appStage);
  });

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
      setSnackbar({
        message: 'Nota guardada correctamente',
        severity: 'success',
      });
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
      await updateApplicationStage({
        applicationId: candidate.applicationId,
        stage: CANDIDATE_STAGE_TO_APP_STAGE[selectedStageKey],
      });

      setStageHistory((current) => applyStageChange(current, selectedStageKey));
      setCurrentStage(STAGE_LABELS[selectedStageKey]);
      setStageDialogOpen(false);
      setSnackbar({
        message: `Etapa actualizada a "${STAGE_LABELS[selectedStageKey]}"`,
        severity: 'success',
      });
      getStageHistory(candidate.applicationId)
        .then(setRealStageHistory)
        .catch(() => {});
    } catch {
      setSnackbar({
        message: 'No se pudo cambiar la etapa',
        severity: 'error',
      });
    } finally {
      setIsUpdatingStage(false);
    }
  }, [selectedStageKey, candidate.applicationId]);

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
      getStageHistory(candidate.applicationId)
        .then(setRealStageHistory)
        .catch(() => {});
    } catch {
      setSnackbar({
        message: 'No se pudo rechazar al candidato',
        severity: 'error',
      });
    } finally {
      setIsUpdatingStage(false);
    }
  }, [rejectReason, candidate.applicationId]);

  const handleInterviewSave = useCallback(
    async (note: CandidateInterviewNote) => {
      setInterviewNotes((current) => [...current, note]);
      setInterviewModalOpen(false);
      setSnackbar({
        message: 'Evaluación de entrevista registrada',
        severity: 'success',
      });
      getStageHistory(candidate.applicationId)
        .then(setRealStageHistory)
        .catch(() => {});
    },
    [candidate.applicationId],
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
    realStageHistory,
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
    interviewNumber,
  };
}
