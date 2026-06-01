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
import { useEffect, useState } from 'react';
import JobCard from './JobCard';
import { useJobs } from '../hooks/useJobs';
import { useAuth } from '@/shared/lib/authContext';
import { isInternalRole } from '@/shared/lib/internalRoles';

export default function JobPortal() {
  const { data: jobs, isLoading, isError } = useJobs();
  const { role, loading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const isInternal = isInternalRole(role);

  useEffect(() => {
    if (!loading && isInternal) {
      router.replace('/dashboard/positions');
    }
  }, [isInternal, loading, router]);

  const filtered = (jobs ?? []).filter(
    (job) =>
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.department?.toLowerCase().includes(search.toLowerCase()),
  );

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
          onChange={(e) => setSearch(e.target.value)}
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
              filtered.map((job) => (
                <JobCard key={job.id} job={job} disabled={isInternal} />
              ))
            )}
          </Stack>
        )}
      </Box>
    </Container>
  );
}
