'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Stack,
} from '@mui/material';
import { TriangleAlert } from 'lucide-react';
import type { Employee } from '@ats/shared-types';
import ConnectGmailButton from '../../gmail/components/ConnectGmailButton';
import ConnectCalendarButton from '../../calendar/components/ConnectCalendarButton';
import CalendarLinkEditor from '../../calendar/components/CalendarLinkEditor';

interface AuthWarning {
  needsGmail: boolean;
  needsCalendar: boolean;
  needsCalendarLink: boolean;
}

interface AuthWarningDialogProps {
  open: boolean;
  onClose: () => void;
  warning: AuthWarning;
  employee: Employee | null;
}

export function AuthWarningDialog({
  open,
  onClose,
  warning,
  employee,
}: AuthWarningDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}
      >
        <TriangleAlert size={20} color="#f59e0b" />
        Acción requerida
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          {warning.needsGmail && (
            <DialogContentText sx={{ fontSize: '0.875rem' }}>
              Tu cuenta de <strong>Gmail</strong> no está conectada. Es
              necesaria para enviar el correo al candidato.
            </DialogContentText>
          )}
          {warning.needsCalendar && (
            <DialogContentText sx={{ fontSize: '0.875rem' }}>
              Tu cuenta de <strong>Google Calendar</strong> no está conectada.
              Es necesaria para detectar las reservas de entrevistas.
            </DialogContentText>
          )}
          {warning.needsCalendarLink && (
            <DialogContentText sx={{ fontSize: '0.875rem' }}>
              No tenés un <strong>link de agenda</strong> cargado. El correo de
              citación incluye un link para que el candidato reserve su horario.
            </DialogContentText>
          )}
          <Stack spacing={1} sx={{ pt: 0.5 }}>
            {warning.needsGmail && (
              <ConnectGmailButton gmailStatus={employee?.gmailStatus} />
            )}
            {warning.needsCalendar && (
              <ConnectCalendarButton
                calendarStatus={employee?.calendarStatus}
              />
            )}
            {warning.needsCalendarLink && <CalendarLinkEditor />}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
