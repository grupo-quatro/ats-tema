'use client';

import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Container,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowLeft,
  DollarSign,
} from 'lucide-react';
import { Job } from '../../../../../../packages/shared-types/src/models/job';

interface JobDescriptionProps {
  job: Job;
}

const statusLabels: Record<Job['status'], string> = {
  draft: 'Borrador',
  open: 'Abierta',
  paused: 'Pausada',
  closed: 'Cerrada',
};

export default function JobDescription({ job }: JobDescriptionProps) {
  const router = useRouter();
  const mandatorySkills = job.skills.filter((s) => s.type === 'mandatory');
  const desirableSkills = job.skills.filter((s) => s.type === 'desirable');
  const responsabilities = job.responsabilities ?? [];
  const benefits = job.benefits ?? [];
  const jobTypeLabel =
    job.location === 'remote'
      ? 'Remoto'
      : job.location === 'on-site'
        ? 'Presencial'
        : 'Híbrido';

  const salaryLabel =
    job.salaryMin || job.salaryMax
      ? `${job.currency ?? 'USD'} ${job.salaryMin?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '--'} - ${job.salaryMax?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '--'}`
      : 'No disponible';

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowLeft size={18} />}
        onClick={() => router.push('/')}
        sx={{ textTransform: 'none', mb: 2, color: 'text.secondary' }}
      >
        Volver al listado
      </Button>

      <Paper
        elevation={0}
        sx={{
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        <Box
          sx={{ bgcolor: 'primary.main', p: { xs: 4, md: 5 }, color: 'white' }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  bgcolor: 'white',
                  p: 1.5,
                  borderRadius: '50%',
                  display: 'flex',
                  color: 'primary.main',
                }}
              >
                <Building2 size={32} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {job.title}
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{ opacity: 0.9, fontWeight: 400 }}
                >
                  {job.department}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: { xs: 'flex-start', sm: 'flex-end' },
                gap: 1.5,
              }}
            >
              <Chip
                label={statusLabels[job.status]}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 700,
                  backdropFilter: 'blur(4px)',
                }}
              />
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push(`/postulation/${job.id}`)}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  fontWeight: 700,
                  px: 3,
                  borderRadius: '12px',
                  textTransform: 'none',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                }}
              >
                Postularme
              </Button>
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: { xs: 4, md: 5 } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 3,
              mb: 4,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  bgcolor: 'primary.light',
                  p: 1,
                  borderRadius: '12px',
                  color: 'primary.main',
                  display: 'flex',
                }}
              >
                <MapPin size={20} />
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block' }}
                >
                  Ubicación
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {job.city ?? 'No especificada'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  bgcolor: 'primary.light',
                  p: 1,
                  borderRadius: '12px',
                  color: 'primary.main',
                  display: 'flex',
                }}
              >
                <Clock size={20} />
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block' }}
                >
                  Tipo de empleo
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {jobTypeLabel}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  bgcolor: 'primary.light',
                  p: 1,
                  borderRadius: '12px',
                  color: 'primary.main',
                  display: 'flex',
                }}
              >
                <DollarSign size={20} />
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block' }}
                >
                  Rango salarial
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {salaryLabel}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 4 }} />

          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Descripción del puesto
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4, lineHeight: 1.8 }}
          >
            {job.description}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              gap: 4,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Habilidades Requeridas
              </Typography>
              <List sx={{ mb: 0 }}>
                {mandatorySkills.map((skill, index) => (
                  <ListItem key={index} disableGutters sx={{ py: 0.75 }}>
                    <ListItemIcon sx={{ minWidth: '34px', color: '#10b981' }}>
                      <CheckCircle2 size={18} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="text.secondary">
                          {skill.name}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              {desirableSkills.length > 0 && (
                <>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      mt: 3,
                      mb: 1.5,
                      fontWeight: 700,
                      color: 'text.secondary',
                    }}
                  >
                    Deseable
                  </Typography>
                  <List sx={{ mb: 0 }}>
                    {desirableSkills.map((skill, index) => (
                      <ListItem key={index} disableGutters sx={{ py: 0.75 }}>
                        <ListItemIcon
                          sx={{ minWidth: '34px', color: '#6366f1' }}
                        >
                          <CheckCircle2 size={18} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" color="text.secondary">
                              {skill.name}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Responsabilidades
              </Typography>
              <List sx={{ mb: 0 }}>
                {responsabilities.map((item, index) => (
                  <ListItem key={index} disableGutters sx={{ py: 0.75 }}>
                    <ListItemIcon sx={{ minWidth: '34px', color: '#2563eb' }}>
                      <CheckCircle2 size={18} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="text.secondary">
                          {item}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>

          <Box sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              Beneficios
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {benefits.length ? (
                benefits.map((benefit, index) => (
                  <Chip
                    key={index}
                    label={benefit}
                    variant="outlined"
                    sx={{ borderRadius: '12px', textTransform: 'none', mb: 1 }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No hay beneficios especificados.
                </Typography>
              )}
            </Box>
          </Box>

          <Paper
            elevation={0}
            sx={{
              mt: 2,
              p: 4,
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              ¿Te interesa esta posición?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Completa el proceso de postulación y nos pondremos en contacto
              contigo.
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                justifyContent: 'center',
              }}
            >
              <Button
                variant="contained"
                size="large"
                sx={{ px: 4, textTransform: 'none', borderRadius: '12px' }}
                onClick={() => router.push(`/postulation/${job.id}`)}
              >
                Postularme ahora
              </Button>
              <Button
                onClick={() => router.push('/')}
                variant="outlined"
                size="large"
                sx={{ px: 4, textTransform: 'none', borderRadius: '12px' }}
              >
                Ver más ofertas
              </Button>
            </Box>
          </Paper>

          <Box
            sx={{
              mt: 3,
              p: 3,
              bgcolor: '#f8fafc',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Calendar size={16} color="#64748b" />
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: 'primary.main' }}
            >
              Publicada:{' '}
              <Box
                component="span"
                sx={{ fontWeight: 400, color: 'text.secondary' }}
              >
                {job.publishedAt
                  ? new Date(job.publishedAt).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Fecha no disponible'}
              </Box>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
