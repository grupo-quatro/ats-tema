'use client';
import { Box, Typography, Stack, useTheme } from '@mui/material';
import { LucideIcon } from 'lucide-react';

interface StatusInfoBlockProps {
  Icon: LucideIcon;
  title: string;
  description: string;
}

export function StatusInfoBlock({
  Icon,
  title,
  description,
}: StatusInfoBlockProps) {
  const theme = useTheme();

  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', mb: 3 }}>
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 1,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} color={theme.palette.primary.main} />
      </Box>
      <Box>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, color: 'text.primary' }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', lineHeight: 1.4 }}
        >
          {description}
        </Typography>
      </Box>
    </Stack>
  );
}
