import { Box, Typography } from '@mui/material';
import { Users } from 'lucide-react';

export default function CandidatesPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 2,
        color: '#94a3b8',
      }}
    >
      <Users size={48} strokeWidth={1} />
      <Typography variant="h2" sx={{ color: '#334155', fontWeight: 500 }}>
        Candidatos
      </Typography>
      <Typography variant="body2">Esta sección está en construcción.</Typography>
    </Box>
  );
}
