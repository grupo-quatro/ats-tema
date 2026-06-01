'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Sidebar from '../components/sidebar/Sidebar';
import { useAuth } from '../shared/lib/authContext';

function DashboardSkeleton() {
  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        minHeight: { xs: 'calc(100dvh - 56px)', sm: 'calc(100dvh - 64px)' },
      }}
    >
      <Box
        sx={{
          width: 240,
          flexShrink: 0,
          bgcolor: 'background.paper',
          p: 2,
          alignSelf: 'stretch',
        }}
      >
        <Stack spacing={1}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={40} />
          ))}
        </Stack>
      </Box>
      <Box sx={{ flex: 1, p: 3 }}>
        <Skeleton variant="rounded" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={400} />
      </Box>
    </Box>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) return <DashboardSkeleton />;
  if (!user) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        minHeight: { xs: 'calc(100dvh - 56px)', sm: 'calc(100dvh - 64px)' },
      }}
    >
      <Sidebar />
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          bgcolor: '#f8fafc',
          overflowY: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
