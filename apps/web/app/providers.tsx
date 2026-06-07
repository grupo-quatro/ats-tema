'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import theme from './lib/theme';
import ThemeRegistry from './theme-registry';
import { AuthProvider } from './shared/lib/authContext';
import GmailCodeHandler from './features/gmail/components/GmailCodeHandler';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <ThemeRegistry>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            <GmailCodeHandler />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ThemeRegistry>
  );
}
