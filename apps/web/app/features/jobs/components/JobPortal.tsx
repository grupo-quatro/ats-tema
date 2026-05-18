'use client';

import {
  Container,
  Box,
  Typography,
  Card,
  TextField,
  InputAdornment,
  Stack,
} from '@mui/material';
import { Briefcase, Search } from 'lucide-react';
import JobCard from './JobCard';
import { JOBS_DATA } from '../services/jobs';

export default function JobPortal() {
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
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 2,
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: '50%',
          }}
        >
          <Briefcase size={40} />
        </Box>
        <Typography variant="h1">Portal de Empleo</Typography>
        <Typography variant="body1">
          Descubre oportunidades que se ajusten a tu perfil
        </Typography>
      </Box>
      <Card sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Buscar por título o área..."
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
      <Box
        sx={{
          margin: '50px',
        }}
      >
        <Stack spacing={3}>
          {JOBS_DATA.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </Stack>
      </Box>
    </Container>
  );
}
