'use client';

import { Container, Box } from '@mui/material';
import PositionsFilters from '@/features/dashboard/positions/components/PositionsFilters';
import PositionsTable from '@/features/dashboard/positions/components/PositionsTable';
import { JOBS_DATA } from '@/features/dashboard/positions/services/positions';

export default function PositionsPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box>
        <PositionsFilters />
        <PositionsTable jobs={JOBS_DATA} />
      </Box>
    </Container>
  );
}
