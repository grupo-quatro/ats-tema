'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from '@mui/material';
import {
  Eye,
  Edit2,
  Trash2,
  Users,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { Job } from '@ats/shared-types';
import type {
  ListPositionsOrderBy,
  ListPositionsOrderDir,
} from '../hooks/usePositions';
import { useUpdatePositionStatus } from '../hooks/useUpdatePositionStatus';
import { useDeletePosition } from '../hooks/useDeletePosition';
import { getJobStatusStyle } from '@/shared/lib/jobStatus';

type Props = {
  jobs: Job[];
  orderBy?: ListPositionsOrderBy;
  orderDir?: ListPositionsOrderDir;
  onSort?: (field: ListPositionsOrderBy) => void;
};

const actionButtonSx = {
  width: 32,
  height: 32,
  p: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function PositionsTable({
  jobs,
  orderBy,
  orderDir,
  onSort,
}: Props) {
  const { mutate: updateStatus } = useUpdatePositionStatus();
  const deletePositionMutation = useDeletePosition();
  const [positionToDelete, setPositionToDelete] = useState<Job | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isDeletingPosition = deletePositionMutation.isPending;

  function handleCloseDeleteDialog() {
    if (isDeletingPosition) return;
    setPositionToDelete(null);
    setDeleteError(null);
  }

  function handleConfirmDeletePosition() {
    if (!positionToDelete) return;

    setDeleteError(null);
    deletePositionMutation.mutate(
      { id: positionToDelete.id },
      {
        onSuccess: () => {
          setPositionToDelete(null);
        },
        onError: (error) => {
          setDeleteError(
            error instanceof Error
              ? error.message
              : 'No se pudo eliminar la posicion.',
          );
        },
      },
    );
  }

  function headerCell(field: ListPositionsOrderBy, label: string) {
    return (
      <TableCell sx={{ color: 'white', fontWeight: 700 }}>
        <TableSortLabel
          active={orderBy === field}
          direction={orderBy === field ? orderDir : 'asc'}
          onClick={() => onSort?.(field)}
          sx={{
            color: 'white !important',
            '& .MuiTableSortLabel-icon': { color: 'white !important' },
          }}
        >
          {label}
        </TableSortLabel>
      </TableCell>
    );
  }

  return (
    <TableContainer
      component={Paper}
      sx={{ mt: 3, borderRadius: 3, boxShadow: 3, overflow: 'hidden' }}
    >
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'primary.main' }}>
            {headerCell('title', 'Posición')}
            {headerCell('department', 'Área')}
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>
              Ubicación
            </TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>Tipo</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>
              Candidatos
            </TableCell>
            {headerCell('status', 'Estado')}
            {headerCell('createdAt', 'Creada')}
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">
              Acciones
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => {
            const statusStyle = getJobStatusStyle(job.status);

            return (
              <TableRow
                key={job.id}
                hover
                sx={{ '&:last-child td': { borderBottom: 0 } }}
              >
                <TableCell sx={{ py: 2.5 }}>
                  <Box sx={{ fontWeight: 700 }}>{job.title}</Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={job.department}
                    variant="outlined"
                    size="small"
                    sx={{ borderRadius: 2 }}
                  />
                </TableCell>
                <TableCell>{job.city ? `${job.city}` : job.location}</TableCell>
                <TableCell>{job.type ?? '—'}</TableCell>
                <TableCell>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      color: 'primary.main',
                    }}
                  >
                    <Users size={14} />{' '}
                    <Box component="span">{job.candidates ?? 0}</Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        bgcolor: statusStyle.backgroundColor,
                        border: `1px solid ${statusStyle.borderColor}`,
                        color: statusStyle.color,
                        px: 1.2,
                        py: 0.4,
                        borderRadius: '999px',
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {statusStyle.label}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  {job.createdAt
                    ? new Date(job.createdAt).toLocaleDateString('es-AR')
                    : '-'}
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 148 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 0.5,
                    }}
                  >
                    <Link
                      href={`/dashboard/positions/${job.id}`}
                      style={{ display: 'inline-flex', lineHeight: 0 }}
                    >
                      <IconButton
                        size="small"
                        aria-label={`Ver ${job.title}`}
                        sx={actionButtonSx}
                      >
                        <Eye size={16} />
                      </IconButton>
                    </Link>
                    <Link
                      href={`/dashboard/positions/${job.id}/edit`}
                      style={{ display: 'inline-flex', lineHeight: 0 }}
                    >
                      <IconButton
                        size="small"
                        aria-label={`Editar ${job.title}`}
                        sx={actionButtonSx}
                      >
                        <Edit2 size={16} />
                      </IconButton>
                    </Link>
                    <IconButton
                      size="small"
                      aria-label={
                        job.status === 'open'
                          ? `Cerrar ${job.title}`
                          : `Abrir ${job.title}`
                      }
                      title={
                        job.status === 'open'
                          ? 'Cerrar posición'
                          : 'Abrir posición'
                      }
                      onClick={() =>
                        updateStatus({
                          id: job.id,
                          status: job.status === 'open' ? 'closed' : 'open',
                        })
                      }
                      sx={actionButtonSx}
                    >
                      {job.status === 'open' ? (
                        <ToggleRight size={16} color={statusStyle.color} />
                      ) : (
                        <ToggleLeft size={16} color={statusStyle.color} />
                      )}
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label={`Eliminar ${job.title}`}
                      sx={actionButtonSx}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Dialog
        open={Boolean(positionToDelete)}
        onClose={handleCloseDeleteDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Eliminar posicion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Esta accion eliminara la posicion
            {positionToDelete ? ` "${positionToDelete.title}"` : ''}. No
            aparecera en el dashboard ni en el portal de empleos.
          </DialogContentText>
          {deleteError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseDeleteDialog}
            disabled={isDeletingPosition}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeletePosition}
            disabled={isDeletingPosition}
          >
            {isDeletingPosition ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </TableContainer>
  );
}
