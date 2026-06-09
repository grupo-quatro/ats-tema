'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { CalendarDays, CheckCircle, AlertCircle } from 'lucide-react';
import { updateCalendarLink } from '../../../shared/api/calendarApi';
import { useEmployeeProfile } from '../hooks/useEmployeeProfile';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export default function CalendarLinkEditor() {
  const { employee, loading } = useEmployeeProfile();
  const [value, setValue] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (employee?.calendarLink !== undefined) {
      setValue(employee.calendarLink);
    }
  }, [employee?.calendarLink]);

  async function handleSave() {
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      await updateCalendarLink(value.trim());
      setSaveStatus('success');
    } catch (err) {
      setSaveStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'No se pudo guardar el link.',
      );
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
        <CircularProgress size={16} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <CalendarDays size={14} color="#64748b" />
        <Typography
          sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary' }}
        >
          Link de agenda
        </Typography>
      </Box>

      <TextField
        size="small"
        fullWidth
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaveStatus('idle');
          setErrorMessage(null);
        }}
        placeholder="https://calendar.google.com/calendar/appointments/..."
        slotProps={{ htmlInput: { style: { fontSize: '0.75rem' } } }}
        sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
      />

      {saveStatus === 'success' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CheckCircle size={14} color="#16a34a" />
          <Typography sx={{ fontSize: '0.7rem', color: 'success.main' }}>
            Link guardado
          </Typography>
        </Box>
      )}

      {saveStatus === 'error' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AlertCircle size={14} color="#ef4444" />
          <Typography sx={{ fontSize: '0.7rem', color: 'error.main' }}>
            {errorMessage ?? 'Error al guardar.'}
          </Typography>
        </Box>
      )}

      <Button
        variant="outlined"
        size="small"
        disabled={saveStatus === 'saving'}
        onClick={handleSave}
        startIcon={
          saveStatus === 'saving' ? (
            <CircularProgress size={12} color="inherit" />
          ) : undefined
        }
        sx={{ textTransform: 'none', fontWeight: 500, fontSize: '0.75rem' }}
      >
        {saveStatus === 'saving' ? 'Guardando...' : 'Guardar'}
      </Button>
    </Box>
  );
}
