'use client';

import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import { AlertCircle, Globe } from 'lucide-react';
import { buildGoogleUnifiedOAuthUrl } from '../../../shared/api/googleOAuthApi';

type Status = 'idle' | 'loading' | 'error';

export default function ConnectGoogleButton() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const onError = (e: Event) => {
      setErrorMessage(
        (e as CustomEvent<string>).detail ?? 'Error al conectar con Google',
      );
      setStatus('error');
    };
    window.addEventListener('gmail-connect-error', onError);
    return () => window.removeEventListener('gmail-connect-error', onError);
  }, []);

  const connect = useCallback(() => {
    window.location.href = buildGoogleUnifiedOAuthUrl();
  }, []);

  if (status === 'loading') {
    return (
      <Button
        variant="outlined"
        size="small"
        disabled
        startIcon={<CircularProgress size={14} color="inherit" />}
        sx={{ textTransform: 'none', fontWeight: 500 }}
      >
        Conectando...
      </Button>
    );
  }

  if (status === 'error') {
    return (
      <Tooltip title={errorMessage ?? 'Error al conectar con Google'}>
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={connect}
          startIcon={<AlertCircle size={16} />}
          sx={{ textTransform: 'none', fontWeight: 500 }}
        >
          Reintentar conexión
        </Button>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="outlined"
      color="error"
      size="small"
      onClick={connect}
      startIcon={<Globe size={16} />}
      sx={{ textTransform: 'none', fontWeight: 500 }}
    >
      Conectar con Google
    </Button>
  );
}
