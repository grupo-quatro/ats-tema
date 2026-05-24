'use client';

import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Box,
  Chip,
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

type Props = {
  jobs: Job[];
  orderBy?: ListPositionsOrderBy;
  orderDir?: ListPositionsOrderDir;
  onSort?: (field: ListPositionsOrderBy) => void;
};

export default function PositionsTable({
  jobs,
  orderBy,
  orderDir,
  onSort,
}: Props) {
  const { mutate: updateStatus } = useUpdatePositionStatus();

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
            {headerCell('publishedAt', 'Publicada')}
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">
              Acciones
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => (
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
                      bgcolor: '#d1fae5',
                      color: '#065f46',
                      px: 1.2,
                      py: 0.4,
                      borderRadius: '999px',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {job.status === 'open'
                      ? 'Abierta'
                      : job.status === 'paused'
                        ? 'Pausada'
                        : job.status === 'closed'
                          ? 'Cerrada'
                          : 'Borrador'}
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                {job.publishedAt
                  ? new Date(job.publishedAt).toLocaleDateString('es-AR')
                  : '-'}
              </TableCell>
              <TableCell align="right">
                <Link
                  href={`/dashboard/positions/${job.id}`}
                  style={{ display: 'inline-flex' }}
                >
                  <IconButton size="small">
                    <Eye size={16} />
                  </IconButton>
                </Link>
                <Link
                  href={`/dashboard/positions/${job.id}/edit`}
                  style={{ display: 'inline-flex' }}
                >
                  <IconButton size="small">
                    <Edit2 size={16} />
                  </IconButton>
                </Link>
                <IconButton
                  size="small"
                  title={
                    job.status === 'open' ? 'Cerrar posición' : 'Abrir posición'
                  }
                  onClick={() =>
                    updateStatus({
                      id: job.id,
                      status: job.status === 'open' ? 'closed' : 'open',
                    })
                  }
                >
                  {job.status === 'open' ? (
                    <ToggleRight size={16} color="#16a34a" />
                  ) : (
                    <ToggleLeft size={16} color="#94a3b8" />
                  )}
                </IconButton>
                <IconButton size="small">
                  <Trash2 size={16} />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
