'use client';

import {
  Container,
  Box,
  Typography,
  Card,
  TextField,
  InputAdornment,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import JobCard from './JobCard';
import { useJobs } from '../hooks/useJobs';
import { useAuth } from '@/shared/lib/authContext';
import { isInternalRole } from '@/shared/lib/internalRoles';
import PaginationControls from '@/shared/components/PaginationControls';
import { usePaginationParams } from '@/shared/lib/usePaginationParams';

const JOB_PORTAL_PAGE_SIZE = 6;

export default function JobPortal() {
  const { data: jobs, isLoading, isError } = useJobs();
  const { role, loading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const isInternal = isInternalRole(role);
  const { page, setPage } = usePaginationParams();

  useEffect(() => {
    if (!loading && isInternal) {
      router.replace('/dashboard/positions');
    }
  }, [isInternal, loading, router]);

  const filtered = useMemo(
    () =>
      (jobs ?? []).filter(
        (job) =>
          job.title.toLowerCase().includes(search.toLowerCase()) ||
          job.department?.toLowerCase().includes(search.toLowerCase()),
      ),
    [jobs, search],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / JOB_PORTAL_PAGE_SIZE),
  );
  const paginatedJobs = useMemo(() => {
    const start = (page - 1) * JOB_PORTAL_PAGE_SIZE;
    return filtered.slice(start, start + JOB_PORTAL_PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, setPage, totalPages]);

  return (
    <Container>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: '50px',
          marginBottom: '50px',
        }}
      >
        <Typography variant="h1">Trabaja con Nosotros</Typography>
      </Box>
      <Card sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Buscar por título o área..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="#94a3b8" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Card>
      <Box sx={{ margin: '50px' }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}
        {isError && (
          <Alert severity="error">
            No se pudieron cargar las posiciones. Intentá de nuevo más tarde.
          </Alert>
        )}
        {!isLoading && !isError && (
          <Stack spacing={3}>
            {filtered.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
                No se encontraron posiciones.
              </Typography>
            ) : (
              paginatedJobs.map((job) => (
                <JobCard key={job.id} job={job} disabled={isInternal} />
              ))
            )}
          </Stack>
        )}
        {!isLoading && !isError ? (
          <PaginationControls
            page={page}
            pageSize={JOB_PORTAL_PAGE_SIZE}
            totalItems={filtered.length}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        ) : null}
      </Box>
    </Container>
  );
}
