'use client';

import { Card, Typography, Box, Stack } from '@mui/material';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface MethodCardProps {
  title: string;
  description: string;
  badgeText: string;
  Icon: LucideIcon;
  href?: string;
}

export function MethodCard({
  title,
  description,
  badgeText,
  Icon,
  href,
}: MethodCardProps) {
  const card = (
    <Card
      sx={{
        flex: 1,
        maxWidth: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        p: 4,
        gap: 3,
        transition: 'all 0.2s ease-in-out',
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',

        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0px 10px 20px rgba(37, 99, 235, 0.1)',
          '& .icon-container': { bgcolor: 'primary.main', color: 'white' },
          '& .badge-box': { bgcolor: 'aliceblue' },
          '& .badge-text': { color: 'primary.main' },
        },
      }}
    >
      <Box
        className="icon-container"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          color: 'text.secondary',
          p: 3,
          borderRadius: '50%',
          transition: '0.2s',
        }}
      >
        <Icon size={40} />
      </Box>

      <Stack spacing={1}>
        <Typography variant="h2">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Stack>

      <Box
        className="badge-box"
        sx={{
          bgcolor: 'background.default',
          px: 3,
          py: 1,
          borderRadius: 2,
          transition: '0.2s',
        }}
      >
        <Typography
          className="badge-text"
          variant="body2"
          sx={{ fontWeight: 500, color: 'text.secondary' }}
        >
          {badgeText}
        </Typography>
      </Box>
    </Card>
  );

  if (href == null || href === '') {
    return card;
  }

  return (
    <Link
      href={href}
      prefetch={false}
      style={{
        flex: 1,
        maxWidth: 400,
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
      }}
    >
      {card}
    </Link>
  );
}
