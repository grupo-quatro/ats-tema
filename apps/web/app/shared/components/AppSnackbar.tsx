'use client';

import { Alert, Snackbar } from '@mui/material';

export type AppSnackbarState = {
  message: string;
  severity: 'success' | 'error';
} | null;

type Props = {
  snackbar: AppSnackbarState;
  onClose: () => void;
  autoHideDuration?: number;
};

export default function AppSnackbar({
  snackbar,
  onClose,
  autoHideDuration = 3000,
}: Props) {
  return (
    <Snackbar
      open={Boolean(snackbar)}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      {snackbar ? (
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={onClose}
          sx={{
            minWidth: { xs: 'calc(100vw - 32px)', sm: 420 },
            py: 1.5,
            px: 2,
            borderRadius: '12px',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.24)',
            fontSize: '0.95rem',
            fontWeight: 700,
            alignItems: 'center',
          }}
        >
          {snackbar.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
