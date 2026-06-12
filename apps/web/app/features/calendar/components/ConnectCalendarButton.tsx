'use client';

import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import { CalendarDays, CheckCircle, AlertCircle } from 'lucide-react';
import type { GmailStatus } from '@ats/shared-types';
import { useCalendarConnect } from '../hooks/useCalendarConnect';

interface Props {
  calendarStatus?: GmailStatus;
}

export default function ConnectCalendarButton({ calendarStatus }: Props) {
  const { status, errorMessage, connect } = useCalendarConnect(calendarStatus);

  if (status === 'connected') {
    return (
      <Button
        variant="outlined"
        color="success"
        size="small"
        disabled
        startIcon={<CheckCircle size={16} />}
        sx={{
          textTransform: 'none',
          fontWeight: 500,
          '&.Mui-disabled': {
            color: 'success.main',
            borderColor: 'success.main',
          },
        }}
      >
        Calendario conectado
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
      <Tooltip title={errorMessage ?? 'Error al conectar Google Calendar'}>
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
      startIcon={<CalendarDays size={16} />}
      sx={{ textTransform: 'none', fontWeight: 500 }}
    >
      Conectar Google Calendar
    </Button>
  );
}
