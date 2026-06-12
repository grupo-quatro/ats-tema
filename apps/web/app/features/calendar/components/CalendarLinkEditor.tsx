'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { updateCalendarLink } from '../../../shared/api/calendarApi';
import { useEmployeeProfile } from '../hooks/useEmployeeProfile';

type SaveStatus = 'idle' | 'saving' | 'error';

export default function CalendarLinkEditor() {
  const { employee, loading } = useEmployeeProfile();
  const [value, setValue] = useState('');
  const [savedThisSession, setSavedThisSession] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setValue(employee.calendarLink ?? '');
    }
  }, [employee]);

  async function handleSave() {
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      await updateCalendarLink(value.trim());
      setSavedThisSession(value.trim());
      setSaveStatus('idle');
      setEditing(false);
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

  // savedThisSession=null means no save happened yet this session → use Firestore value
  const hasSavedLink =
    savedThisSession !== null
      ? Boolean(savedThisSession.trim())
      : Boolean(employee?.calendarLink?.trim());

  if (!editing) {
    if (hasSavedLink) {
      return (
        <Button
          variant="outlined"
          color="success"
          size="small"
          disabled
          fullWidth
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
          Link de agenda cargado
        </Button>
      );
    }

    return (
      <Button
        variant="outlined"
        color="error"
        size="small"
        fullWidth
        onClick={() => setEditing(true)}
        startIcon={<XCircle size={16} />}
        sx={{ textTransform: 'none', fontWeight: 500 }}
      >
        Agregar agenda
      </Button>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <TextField
        size="small"
        fullWidth
        autoFocus
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

      {saveStatus === 'error' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AlertCircle size={14} color="#ef4444" />
          <Box
            component="span"
            sx={{ fontSize: '0.7rem', color: 'error.main' }}
          >
            {errorMessage ?? 'Error al guardar.'}
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
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
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.75rem',
            flex: 1,
          }}
        >
          {saveStatus === 'saving' ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button
          variant="text"
          size="small"
          disabled={saveStatus === 'saving'}
          onClick={() => {
            setValue(savedThisSession ?? employee?.calendarLink ?? '');
            setSaveStatus('idle');
            setEditing(false);
          }}
          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
        >
          Cancelar
        </Button>
      </Box>
    </Box>
  );
}
