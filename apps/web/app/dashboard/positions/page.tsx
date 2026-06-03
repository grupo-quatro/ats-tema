'use client';

import { useEffect, useState } from 'react';
import { Container, Box, CircularProgress, Typography } from '@mui/material';
import PositionsFilters, {
  type PositionFilters,
} from '@/features/dashboard/positions/components/PositionsFilters';
import PositionsTable from '@/features/dashboard/positions/components/PositionsTable';
import PaginationControls from '@/shared/components/PaginationControls';
import {
  usePositions,
  type ListPositionsOrderBy,
  type ListPositionsOrderDir,
} from '@/features/dashboard/positions/hooks/usePositions';
import { useDepartments } from '@/features/dashboard/positions/hooks/useDepartments';
import { usePaginationParams } from '@/shared/lib/usePaginationParams';

const DEFAULT_FILTERS: PositionFilters = {
  search: '',
  status: '',
  location: '',
  department: '',
};

const POSITIONS_PAGE_SIZE = 10;

export default function PositionsPage() {
  const [filters, setFilters] = useState<PositionFilters>(DEFAULT_FILTERS);
  const [orderBy, setOrderBy] = useState<ListPositionsOrderBy>('createdAt');
  const [orderDir, setOrderDir] = useState<ListPositionsOrderDir>('desc');
  const { page, setPage } = usePaginationParams();

  const { data, isLoading, isError } = usePositions({
    ...filters,
    status: filters.status || undefined,
    location: filters.location || undefined,
    page,
    limit: POSITIONS_PAGE_SIZE,
    orderBy,
    orderDir,
  });

  useEffect(() => {
    if (data && data.totalPages > 0 && page > data.totalPages) {
      setPage(data.totalPages);
    }
  }, [data, page, setPage]);

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
            <PaginationControls
              page={page}
              pageSize={POSITIONS_PAGE_SIZE}
              totalItems={data.total}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </Box>
    </Container>
  );
}
