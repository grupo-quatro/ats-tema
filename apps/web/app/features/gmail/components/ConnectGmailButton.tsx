'use client';

import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useGmailConnect } from '../hooks/useGmailConnect';

function ConnectGmailButtonInner() {
  const { status, errorMessage, connect } = useGmailConnect();

  if (status === 'connected') {
    return (
      <Button
        variant="outlined"
        color="success"
        size="small"
        disabled
        startIcon={<CheckCircle size={16} />}
        sx={{ textTransform: 'none', fontWeight: 500 }}
      >
        Gmail conectado
      </Button>
    );
  }

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
      <Tooltip title={errorMessage ?? 'Error al conectar Gmail'}>
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
      size="small"
      onClick={connect}
      startIcon={<Mail size={16} />}
      sx={{ textTransform: 'none', fontWeight: 500 }}
    >
      Conectar Gmail
    </Button>
  );
}

export default function ConnectGmailButton() {
  return <ConnectGmailButtonInner />;
}
