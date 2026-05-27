'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material';
import { Eye, Filter, Search } from 'lucide-react';
import type {
  ApplicationStage,
  ApplicationWithCandidateDTO,
} from '@ats/shared-types';
import { STAGE_LABELS } from '../constants/stageLabels';
import { useGetCandidatesByJob } from '../hooks/usePipeline';

type Props = {
  jobId: string;
  jobTitle: string;
  onViewCandidate: (candidate: ApplicationWithCandidateDTO) => void;
};

type SortField = 'candidateName' | 'fitScore' | 'stage' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

const ALL_STAGES = 'Todos los estados';

function formatDate(value?: Date | string): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getScoreColor(score: number): string {
  if (score >= 85) return '#16a34a';
  if (score >= 80) return '#2563eb';
  return '#d97706';
}

function getStatusChipSx(stage: ApplicationStage) {
  if (stage === 'interview_2_done' || stage === 'interview_1_done') {
    return { bgcolor: '#fef3c7', color: '#b45309' };
  }
  if (stage === 'interview_2_scheduled' || stage === 'interview_1_scheduled') {
    return { bgcolor: '#cffafe', color: '#0891b2' };
  }
  if (stage === 'cv_submitted') {
    return { bgcolor: '#dbeafe', color: '#4f46e5' };
  }
  if (
    stage === 'screening' ||
    stage === 'applied' ||
    stage === 'profile_pending'
  ) {
    return { bgcolor: '#f3e8ff', color: '#9333ea' };
  }
  if (stage === 'hired' || stage === 'offer_sent') {
    return { bgcolor: '#dcfce7', color: '#16a34a' };
  }
  if (stage === 'rejected' || stage === 'withdrawn') {
    return { bgcolor: '#fee2e2', color: '#ef4444' };
  }
  return { bgcolor: '#f1f5f9', color: '#334155' };
}

function compareValues(
  left: ApplicationWithCandidateDTO,
  right: ApplicationWithCandidateDTO,
  sortField: SortField,
): number {
  if (sortField === 'fitScore') {
    return (left.fitScore ?? 0) - (right.fitScore ?? 0);
  }

  if (sortField === 'updatedAt') {
    return (
      new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
    );
  }

  if (sortField === 'stage') {
    return STAGE_LABELS[left.stage].localeCompare(STAGE_LABELS[right.stage]);
  }

  return (left.candidateName ?? '').localeCompare(right.candidateName ?? '');
}

function LoadingRows() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((item) => (
        <TableRow key={item}>
          <TableCell>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Skeleton variant="circular" width={42} height={42} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="50%" height={22} />
                <Skeleton width="34%" height={18} />
              </Box>
            </Stack>
          </TableCell>
          <TableCell>
            <Skeleton width={52} />
          </TableCell>
          <TableCell>
            <Skeleton width={210} height={28} sx={{ borderRadius: '999px' }} />
          </TableCell>
          <TableCell>
            <Skeleton width={92} />
          </TableCell>
          <TableCell>
            <Skeleton width={120} height={36} sx={{ borderRadius: '8px' }} />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function CandidatePipeline({
  jobId,
  jobTitle,
  onViewCandidate,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(ALL_STAGES);
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [sortField, setSortField] = useState<SortField>('fitScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const {
    data: candidates = [],
    isLoading,
    isError,
  } = useGetCandidatesByJob(jobId);

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return candidates
      .filter((candidate) => {
        const matchesSearch =
          !normalizedSearch ||
          candidate.candidateName?.toLowerCase().includes(normalizedSearch) ||
          candidate.candidateEmail?.toLowerCase().includes(normalizedSearch) ||
          candidate.fitSummary?.toLowerCase().includes(normalizedSearch);

        const matchesStatus =
          selectedStatus === ALL_STAGES ||
          STAGE_LABELS[candidate.stage] === selectedStatus;

        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        const result = compareValues(left, right, sortField);
        return sortDirection === 'asc' ? result : -result;
      });
  }, [candidates, searchTerm, selectedStatus, sortDirection, sortField]);

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection(field === 'fitScore' ? 'desc' : 'asc');
  }

  const stageOptions = [ALL_STAGES, ...Object.values(STAGE_LABELS)];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f8fafc',
        px: { xs: 2, md: 5 },
        py: { xs: 3, md: 4 },
      }}
    >
      <Stack spacing={3}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: '16px',
            bgcolor: '#ffffff',
            boxShadow: '0 18px 38px rgba(15, 23, 42, 0.16)',
            border: '1px solid #e2e8f0',
          }}
        >
          <Typography
            variant="h1"
            sx={{
              color: '#0f172a',
              fontSize: { xs: '26px', md: '32px' },
              lineHeight: 1.15,
              mb: 1,
            }}
          >
            {jobTitle}
          </Typography>
          <Typography sx={{ color: '#334155', fontSize: '1rem', mb: 3.5 }}>
            {isLoading
              ? 'Cargando candidatos...'
              : `${filteredCandidates.length} Candidatos`}
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              placeholder="Buscar por nombre o habilidades..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={20} color="#64748b" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 52,
                  bgcolor: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '1rem',
                },
              }}
            />
            <Button
              variant="outlined"
              startIcon={<Filter size={20} />}
              onClick={(event) => setFilterAnchor(event.currentTarget)}
              sx={{
                height: 52,
                minWidth: 126,
                px: 3,
                bgcolor: '#ffffff',
                borderColor: '#dbe2ea',
                color: '#334155',
                fontSize: '1rem',
                fontWeight: 600,
                '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
              }}
            >
              Filtros
            </Button>
          </Stack>
        </Paper>

        {isError ? (
          <Alert severity="error" sx={{ borderRadius: '12px' }}>
            No se pudieron cargar los candidatos de esta posición.
          </Alert>
        ) : null}

        <TableContainer
          component={Paper}
          sx={{
            borderRadius: '16px',
            overflow: 'hidden',
            bgcolor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 18px 38px rgba(15, 23, 42, 0.14)',
          }}
        >
          <Table sx={{ minWidth: 940 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#2563eb' }}>
                <TableCell sx={{ color: 'white', fontWeight: 700, py: 2 }}>
                  Candidato
                </TableCell>
                <TableCell
                  sx={{ color: 'white', fontWeight: 700, py: 2, width: 140 }}
                >
                  <TableSortLabel
                    active={sortField === 'fitScore'}
                    direction={
                      sortField === 'fitScore' ? sortDirection : 'desc'
                    }
                    onClick={() => handleSort('fitScore')}
                    sx={{
                      color: 'white !important',
                      '& .MuiTableSortLabel-icon': {
                        color: 'white !important',
                      },
                    }}
                  >
                    % FIT
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sx={{ color: 'white', fontWeight: 700, py: 2, width: 360 }}
                >
                  <TableSortLabel
                    active={sortField === 'stage'}
                    direction={sortField === 'stage' ? sortDirection : 'asc'}
                    onClick={() => handleSort('stage')}
                    sx={{
                      color: 'white !important',
                      '& .MuiTableSortLabel-icon': {
                        color: 'white !important',
                      },
                    }}
                  >
                    Estado
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sx={{ color: 'white', fontWeight: 700, py: 2, width: 220 }}
                >
                  Última actualización
                </TableCell>
                <TableCell
                  sx={{ color: 'white', fontWeight: 700, py: 2, width: 190 }}
                >
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading ? <LoadingRows /> : null}

              {!isLoading && filteredCandidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 6, textAlign: 'center' }}>
                    <Typography sx={{ color: '#334155', fontWeight: 600 }}>
                      No hay candidatos para mostrar.
                    </Typography>
                    <Typography
                      sx={{ color: '#64748b', fontSize: '0.9rem', mt: 0.5 }}
                    >
                      Ajustá la búsqueda o el filtro de estado.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}

              {!isLoading
                ? filteredCandidates.map((candidate) => {
                    const score = candidate.fitScore ?? 0;
                    return (
                      <TableRow
                        key={candidate.id}
                        hover
                        sx={{
                          '& td': {
                            py: 2,
                            borderColor: '#eef2f7',
                          },
                        }}
                      >
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1.5}
                            sx={{ alignItems: 'center' }}
                          >
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                sx={{
                                  color: '#0f172a',
                                  fontSize: '1rem',
                                  fontWeight: 600,
                                  lineHeight: 1.25,
                                }}
                              >
                                {candidate.candidateName ??
                                  'Candidato sin nombre'}
                              </Typography>
                              <Typography
                                sx={{
                                  color: '#334155',
                                  fontSize: '0.9rem',
                                  mt: 0.4,
                                  lineHeight: 1.2,
                                }}
                              >
                                {jobTitle}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography
                            sx={{
                              color: getScoreColor(score),
                              fontSize: '1rem',
                              fontWeight: 600,
                            }}
                          >
                            {score}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STAGE_LABELS[candidate.stage]}
                            size="small"
                            sx={{
                              ...getStatusChipSx(candidate.stage),
                              borderRadius: '999px',
                              fontWeight: 500,
                              height: 24,
                              px: 0.6,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            sx={{ color: '#334155', fontSize: '0.94rem' }}
                          >
                            {formatDate(candidate.updatedAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            startIcon={<Eye size={16} />}
                            onClick={() => onViewCandidate(candidate)}
                            sx={{
                              bgcolor: '#eff6ff',
                              color: '#2563eb',
                              px: 2,
                              height: 36,
                              boxShadow: 'none',
                              fontWeight: 600,
                              '&:hover': {
                                bgcolor: '#dbeafe',
                                boxShadow: 'none',
                              },
                            }}
                          >
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={() => setFilterAnchor(null)}
      >
        {stageOptions.map((option) => (
          <MenuItem
            key={option}
            selected={option === selectedStatus}
            onClick={() => {
              setSelectedStatus(option);
              setFilterAnchor(null);
            }}
          >
            {option}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
