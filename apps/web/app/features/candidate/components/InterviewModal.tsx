'use client';

import { Box, Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import { X } from 'lucide-react';

interface InterviewModalProps {
  open: boolean;
  onClose: () => void;
  candidateName: string;
}

export function InterviewModal({ open, onClose, candidateName }: InterviewModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { overflow: 'hidden' } }}
    >
      <Box
        sx={(theme) => ({
          px: 4,
          py: 2.5,
          background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        })}
      >
        <Box>
          <Typography sx={{ color: 'white', fontWeight: 500, fontSize: 18 }}>
            Realizar Entrevista
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
            {candidateName}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }} aria-label="Cerrar">
          <X size={20} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 4, minHeight: 200 }}>
        {/* TODO: contenido del formulario de entrevista */}
      </DialogContent>
    </Dialog>
  );
}
