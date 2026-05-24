'use client';

import { useState } from 'react';
import {
  Container,
  Box,
  CircularProgress,
  Typography,
  Pagination,
} from '@mui/material';
import PositionsFilters, {
  type PositionFilters,
} from '@/features/dashboard/positions/components/PositionsFilters';
import PositionsTable from '@/features/dashboard/positions/components/PositionsTable';
import {
  usePositions,
  type ListPositionsOrderBy,
  type ListPositionsOrderDir,
} from '@/features/dashboard/positions/hooks/usePositions';
import { useDepartments } from '@/features/dashboard/positions/hooks/useDepartments';

const DEFAULT_FILTERS: PositionFilters = {
  search: '',
  status: '',
  location: '',
  department: '',
};

const PAGE_SIZE = 10;

export default function PositionsPage() {
  const [filters, setFilters] = useState<PositionFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState<ListPositionsOrderBy>('publishedAt');
  const [orderDir, setOrderDir] = useState<ListPositionsOrderDir>('desc');

  const { data, isLoading, isError } = usePositions({
    ...filters,
    status: filters.status || undefined,
    location: filters.location || undefined,
    page,
    limit: PAGE_SIZE,
    orderBy,
    orderDir,
  });

  function handleSort(field: ListPositionsOrderBy) {
    if (field === orderBy) {
      setOrderDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(field);
      setOrderDir('asc');
    }
    setPage(1);
  }

  const { data: departments = [] } = useDepartments();

  function handleFiltersChange(newFilters: PositionFilters) {
    setFilters(newFilters);
    setPage(1);
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box>
        <PositionsFilters
          filters={filters}
          departments={departments}
          onChange={handleFiltersChange}
        />
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        )}
        {isError && (
          <Typography color="error" sx={{ mt: 4, textAlign: 'center' }}>
            Error al cargar las posiciones.
          </Typography>
        )}
        {data && (
          <>
            <PositionsTable
              jobs={data.jobs}
              orderBy={orderBy}
              orderDir={orderDir}
              onSort={handleSort}
            />
            {data.totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={data.totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Box>
    </Container>
  );
}
