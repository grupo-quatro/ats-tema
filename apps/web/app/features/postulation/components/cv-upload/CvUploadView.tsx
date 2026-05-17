'use client';

import { useRef, useState } from 'react';
import {
  alpha,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { Upload, FileText, X } from 'lucide-react';

import { ManualCandidateForm } from '../manual-candidate-form/ManualCandidateForm';

const PAGE_MAX_WIDTH = 600;
const CARD_SHADOW =
  '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.06)';

type CvUploadViewProps = { jobId: string };

export function CvUploadView({ jobId }: CvUploadViewProps) {
  const backHref = `/postulation/${jobId}`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    if (file && !file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Solo se aceptan archivos PDF.');
      return;
    }
    setSelectedFile(file);
  };

  const handleNext = () => {
    if (!selectedFile) {
      setFileError('Por favor seleccioná un archivo PDF.');
      return;
    }
    setShowForm(true);
  };

  if (showForm && selectedFile) {
    // TODO: cuando el servicio de parseo esté disponible, llamarlo aquí con `selectedFile`
    // y pasar los campos extraídos como `initialValues` al formulario.
    // Ejemplo:
    //   const parsed = await parseCvService.parse(selectedFile);
    //   <ManualCandidateForm jobId={jobId} preloadedFile={selectedFile} initialValues={parsed} />
    return <ManualCandidateForm jobId={jobId} preloadedFile={selectedFile} />;
  }

  return (
    <Box
      sx={(theme) => ({
        minHeight: '100vh',
        py: { xs: 3, md: 6 },
        px: { xs: 2, md: 3 },
        background: `linear-gradient(to bottom right, ${theme.palette.background.default}, ${alpha(theme.palette.primary.main, 0.08)})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: PAGE_MAX_WIDTH,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: CARD_SHADOW,
        }}
      >
        <Box
          sx={(theme) => ({
            px: { xs: 3, md: 4 },
            py: 3,
            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          })}
        >
          <Box>
            <Typography
              sx={{
                fontSize: { xs: 22, sm: 24 },
                fontWeight: 500,
                color: 'primary.contrastText',
                mb: 0.5,
              }}
            >
              Subir CV
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'primary.contrastText' }}>
              Extraeremos tu información automáticamente
            </Typography>
          </Box>
          <IconButton
            component={Link}
            href={backHref}
            aria-label="Cerrar"
            sx={{ color: 'primary.contrastText', mt: -0.5 }}
          >
            <X size={20} aria-hidden />
          </IconButton>
        </Box>

        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box
            sx={{
              border: '2px dashed',
              borderColor: selectedFile ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
              mb: 3,
              '&:hover': { borderColor: 'primary.main' },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {selectedFile ? (
              <>
                <FileText size={40} style={{ marginBottom: 8 }} />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {selectedFile.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {(selectedFile.size / 1024).toFixed(0)} KB — Clic para cambiar
                </Typography>
              </>
            ) : (
              <>
                <Upload size={40} style={{ marginBottom: 8 }} />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Seleccioná tu CV en PDF
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Hacé clic o arrastrá el archivo aquí
                </Typography>
              </>
            )}
          </Box>

          {fileError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {fileError}
            </Alert>
          )}

          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
          >
            <Button
              variant="outlined"
              component={Link}
              href={backHref}
              sx={{ px: 3 }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={!selectedFile}
              onClick={handleNext}
            >
              Siguiente
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
