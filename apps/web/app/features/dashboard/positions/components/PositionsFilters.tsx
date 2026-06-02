'use client';

import {
  Box,
  TextField,
  Button,
  InputAdornment,
  Card,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { JobStatus, JobLocation } from '@ats/shared-types';

export interface PositionFilters {
  search: string;
  status: JobStatus | '';
  location: JobLocation | '';
  department: string;
}

type Props = {
  filters: PositionFilters;
  departments: string[];
  onChange: (filters: PositionFilters) => void;
};

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'open', label: 'Abierta' },
  { value: 'closed', label: 'Cerrada' },
  { value: 'paused', label: 'Pausada' },
  { value: 'draft', label: 'Borrador' },
];

const LOCATION_OPTIONS: { value: JobLocation; label: string }[] = [
  { value: 'remote', label: 'Remoto' },
  { value: 'on-site', label: 'Presencial' },
  { value: 'hybrid', label: 'Híbrido' },
];

export default function PositionsFilters({
  filters,
  departments,
  onChange,
}: Props) {
  const router = useRouter();

  function update(partial: Partial<PositionFilters>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <Card sx={{ boxShadow: 4, mb: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h2" sx={{ fontWeight: 800 }}>
          Posiciones
        </Typography>
      </Box>
      <Box
        sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <TextField
          placeholder="Buscar por título..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#94a3b8" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 2, minWidth: '200px' }}
        />

        <FormControl sx={{ flex: 1, minWidth: '150px' }}>
          <InputLabel>Estado</InputLabel>
          <Select
            label="Estado"
            value={filters.status}
            onChange={(e) =>
              update({ status: e.target.value as JobStatus | '' })
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ flex: 1, minWidth: '150px' }}>
          <InputLabel>Ubicación</InputLabel>
          <Select
            label="Ubicación"
            value={filters.location}
            onChange={(e) =>
              update({ location: e.target.value as JobLocation | '' })
            }
          >
            <MenuItem value="">Todas</MenuItem>
            {LOCATION_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ flex: 1, minWidth: '150px' }}>
          <InputLabel>Área</InputLabel>
          <Select
            label="Área"
            value={filters.department}
            onChange={(e) => update({ department: e.target.value })}
          >
            <MenuItem value="">Todas</MenuItem>
            {departments.map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          onClick={() =>
            onChange({ search: '', status: '', location: '', department: '' })
          }
          sx={{ whiteSpace: 'nowrap' }}
        >
          Limpiar
        </Button>

        <Button
          variant="contained"
          onClick={() => router.push('/dashboard/positions/create')}
          sx={{ whiteSpace: 'nowrap' }}
        >
          + Nueva Posición
        </Button>
      </Box>
    </Card>
  );
}
