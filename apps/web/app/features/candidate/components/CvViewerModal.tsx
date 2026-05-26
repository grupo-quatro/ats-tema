'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';
import { FileText, X } from 'lucide-react';

interface CvViewerModalProps {
  open: boolean;
  onClose: () => void;
  cvUrl?: string | null;
  candidateName: string;
}

export function CvViewerModal({
  open,
  onClose,
  cvUrl,
  candidateName,
}: CvViewerModalProps) {
  const [isLoading, setIsLoading] = useState(Boolean(cvUrl));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (open && cvUrl) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [open, cvUrl]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { overflow: 'hidden' } } }}
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
            CV Original
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
            {candidateName}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ color: 'white' }}
          aria-label="Cerrar"
        >
          <X size={20} />
        </IconButton>
      </Box>

      <DialogContent
        sx={{ p: 0, minHeight: 520, bgcolor: '#f1f5f9', position: 'relative' }}
      >
        {cvUrl ? (
          <>
            {isLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#f1f5f9',
                  zIndex: 1,
                }}
              >
                <CircularProgress size={36} />
              </Box>
            )}
            {hasError ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 520,
                  gap: 2,
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  No se pudo cargar el CV
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Intentá abrirlo nuevamente en unos momentos.
                </Typography>
              </Box>
            ) : (
              <iframe
                src={cvUrl}
                style={{
                  width: '100%',
                  height: '600px',
                  border: 'none',
                  display: 'block',
                }}
                title={`CV de ${candidateName}`}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            )}
          </>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 520,
              gap: 2,
            }}
          >
            <Box
              sx={(theme) => ({
                bgcolor: theme.palette.primary.light,
                p: 2.5,
                borderRadius: '50%',
                color: 'primary.main',
                display: 'flex',
              })}
            >
              <FileText size={40} />
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Vista previa del CV
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: 'center', maxWidth: 320 }}
            >
              El archivo PDF del candidato se visualizará aquí una vez integrado
              con el almacenamiento.
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
