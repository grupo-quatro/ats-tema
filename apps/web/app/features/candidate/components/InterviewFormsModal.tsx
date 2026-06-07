'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  Rating,
  Typography,
} from '@mui/material';
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  X,
} from 'lucide-react';
import type { EmployeeRole } from '@ats/shared-types';
import {
  fetchInterviewFormResponses,
  type InterviewFormResponse,
} from '../mock/interviewFormsMock';

interface InterviewFormsModalProps {
  open: boolean;
  onClose: () => void;
  applicationId: string;
  candidateName: string;
  role: EmployeeRole | null;
}

function formatSubmittedAt(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return `${parsed.toLocaleDateString('es-AR')} ${parsed.toLocaleTimeString(
    'es-AR',
    { hour: '2-digit', minute: '2-digit' },
  )}`;
}

function typeChipProps(type: InterviewFormResponse['type']) {
  if (type === 'hr') {
    return { label: 'RRHH', bg: '#dbeafe', color: '#1d4ed8' };
  }
  return { label: 'Técnica', bg: '#dcfce7', color: '#15803d' };
}

export function InterviewFormsModal({
  open,
  onClose,
  applicationId,
  candidateName,
  role,
}: InterviewFormsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [forms, setForms] = useState<InterviewFormResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setIsLoading(true);
    setErrorMessage(null);
    fetchInterviewFormResponses(applicationId)
      .then((result) => {
        if (cancelled) return;
        setForms(result);
        setExpandedIds(new Set(result[0]?.id ? [result[0].id] : []));
      })
      .catch(() => {
        if (cancelled) return;
        setErrorMessage(
          'No se pudieron obtener las respuestas de los formularios.',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, applicationId, role]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { overflow: 'hidden' } } }}
    >
      <Box
        sx={(theme) => ({
          px: 4,
          py: 2.5,
          background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        })}
      >
        <Box>
          <Typography sx={{ color: 'white', fontWeight: 500, fontSize: 18 }}>
            Respuestas de formularios
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
            {candidateName}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ color: 'white' }}
          aria-label="Cerrar"
        >
          <X size={20} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, minHeight: 320, bgcolor: '#f8fafc' }}>
        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
            }}
          >
            <CircularProgress size={32} />
          </Box>
        ) : errorMessage ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">{errorMessage}</Alert>
          </Box>
        ) : forms.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              py: 8,
              px: 3,
              textAlign: 'center',
            }}
          >
            <Box
              sx={(theme) => ({
                bgcolor: theme.palette.primary.light,
                color: 'primary.main',
                p: 2,
                borderRadius: '50%',
                display: 'flex',
              })}
            >
              <ClipboardList size={28} />
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              No hay respuestas registradas
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 360 }}
            >
              Cuando se completen entrevistas para esta candidatura, sus
              respuestas se mostrarán aquí.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 3 }}
          >
            {forms.map((form) => {
              const isOpen = expandedIds.has(form.id);
              const chip = typeChipProps(form.type);

              return (
                <Box
                  key={form.id}
                  sx={{
                    bgcolor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    onClick={() => toggleExpanded(form.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      px: 2.5,
                      py: 1.75,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#f8fafc' },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <FileText size={16} color="#64748b" />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, lineHeight: 1.3 }}
                          >
                            {form.title}
                          </Typography>
                          <Chip
                            label={chip.label}
                            size="small"
                            sx={{
                              bgcolor: chip.bg,
                              color: chip.color,
                              fontWeight: 600,
                              fontSize: 11,
                              height: 20,
                              borderRadius: '6px',
                            }}
                          />
                        </Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', lineHeight: 1.4 }}
                        >
                          {form.authorName} · {form.authorRole} ·{' '}
                          {formatSubmittedAt(form.submittedAt)}
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        flexShrink: 0,
                      }}
                    >
                      {typeof form.overallRating === 'number' && (
                        <Rating
                          value={form.overallRating}
                          readOnly
                          size="small"
                        />
                      )}
                      <IconButton
                        size="small"
                        aria-label={isOpen ? 'Colapsar' : 'Expandir'}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleExpanded(form.id);
                        }}
                      >
                        {isOpen ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </IconButton>
                    </Box>
                  </Box>

                  <Collapse in={isOpen}>
                    <Divider />
                    <Box sx={{ px: 2.5, py: 2 }}>
                      {form.decision && (
                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              fontWeight: 600,
                              display: 'block',
                              mb: 0.25,
                            }}
                          >
                            Decisión recomendada
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {form.decision}
                          </Typography>
                        </Box>
                      )}

                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1.75,
                        }}
                      >
                        {form.questions.map((q) => (
                          <Box key={q.id}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'baseline',
                                justifyContent: 'space-between',
                                gap: 1.5,
                                mb: 0.5,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, lineHeight: 1.4 }}
                              >
                                {q.question}
                              </Typography>
                              {typeof q.rating === 'number' && (
                                <Rating
                                  value={q.rating}
                                  readOnly
                                  size="small"
                                />
                              )}
                            </Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontSize: 13, lineHeight: 1.55 }}
                            >
                              {q.answer}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
