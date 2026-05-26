'use client';

import Link from 'next/link';
import { Card, Box, Typography, Stack, Button } from '@mui/material';
import { Building2, MapPin, Clock, Calendar } from 'lucide-react';
import { Job } from '../../../../../../packages/shared-types/src/models/job';

interface JobCardProps {
  job: Job;
}

export default function JobCard({ job }: JobCardProps) {
  return (
    <Card
      sx={{
        p: 3,
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: 'none',
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        sx={{
          mb: 2,
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              bgcolor: 'primary.light',
              color: 'primary.main',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              flexShrink: 0,
            }}
          >
            <Building2 size={24} />
          </Box>
          <Box>
            <Typography
              variant="h2"
              sx={{ fontWeight: 600, fontSize: '1.25rem' }}
            >
              {job.title}
            </Typography>
            {job.department && (
              <Typography variant="body2" color="text.secondary">
                {job.department}
              </Typography>
            )}
          </Box>
        </Stack>

        <Link href={`/jobs/${job.id}`}>
          <Button
            variant="contained"
            sx={{ px: 3, py: 1, textTransform: 'none', borderRadius: '8px' }}
          >
            Ver detalles
          </Button>
        </Link>
      </Stack>

      <Stack direction="row" spacing={4} sx={{ mb: 2 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', color: 'text.secondary' }}
        >
          <MapPin size={16} />
          <Typography variant="body2">{job.city}</Typography>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', color: 'text.secondary' }}
        >
          <Clock size={16} />
          <Typography variant="body2">{job.location}</Typography>
        </Stack>
      </Stack>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, lineHeight: 1.6 }}
      >
        {job.description}
      </Typography>

      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', color: 'text.secondary' }}
      >
        <Calendar size={16} />
        <Typography variant="caption">
          Publicada el{' '}
          {job.publishedAt
            ? new Date(job.publishedAt).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : ''}
        </Typography>
      </Stack>
    </Card>
  );
}
