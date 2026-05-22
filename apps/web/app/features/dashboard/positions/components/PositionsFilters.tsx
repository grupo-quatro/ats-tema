'use client';

import { useRouter } from 'next/navigation';
import {
  Box,
  TextField,
  Button,
  InputAdornment,
  Card,
  Typography,
} from '@mui/material';
import { Search } from 'lucide-react';

type Props = {
  onSearch?: (value: string) => void;
};

export default function PositionsFilters({ onSearch }: Props) {
  const router = useRouter();

  return (
    <Card sx={{ boxShadow: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" sx={{ fontWeight: 800 }}>
          Posiciones Activas
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TextField
          fullWidth
          placeholder="Buscar por título o área..."
          onChange={(e) => onSearch?.(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#94a3b8" />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            mr: 2,
            width: '600px',
          }}
        />

        <Button
          variant="contained"
          onClick={() => router.push('/dashboard/positions/create')}
        >
          + Nueva Posición
        </Button>
      </Box>
    </Card>
  );
}
