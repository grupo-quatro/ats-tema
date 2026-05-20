import Link from 'next/link';
import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowLeft,
  Calendar,
  CircleCheck,
  CircleAlert,
  MapPin,
  Users,
} from 'lucide-react';
import { getJobBySlug } from '../../../features/jobs/services/jobs';
import type { Job } from '@ats/shared-types';

export const dynamic = 'force-dynamic';

interface JobDetailPageProps {
  params: Promise<{ slug: string }>;
}

const statusLabels: Record<
  string,
  { label: string; color: 'primary' | 'success' | 'error' }
> = {
  open: { label: 'Abierta', color: 'success' },
  closed: { label: 'Cerrada', color: 'error' },
};

function InfoCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: '16px 24px',
        borderRadius: '12px',
        bgcolor: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flex: 1,
        minWidth: { xs: '100%', sm: '200px' },
      }}
    >
      <Box
        sx={{
          color: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          bgcolor: '#eff6ff',
          p: 1,
          borderRadius: '8px',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          variant="caption"
          sx={{
            color: '#64748b',
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 500,
            mb: 0.5,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body1"
          sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1.1rem' }}
        >
          {value}
        </Typography>
      </Box>
    </Paper>
  );
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { slug } = await params;
  const job = getJobBySlug(slug) as Job | undefined;

  if (!job) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Posición no encontrada
        </Typography>
        <Link href="/dashboard/positions">Volver a posiciones</Link>
      </Container>
    );
  }

  const status = statusLabels[job.status] || {
    label: 'En proceso',
    color: 'primary',
  };

  // Formateo de fecha
  const formattedDate = job.publishedAt
    ? job.publishedAt instanceof Date
      ? job.publishedAt.toLocaleDateString('es-AR', {
          day: 'numeric',
          month: 'short',
        })
      : String(job.publishedAt)
    : '-';

  return (
    <Container maxWidth="xl" sx={{ py: 4, minHeight: '100vh' }}>
      <Box sx={{ mb: 3 }}>
        <Link href="/dashboard/positions" style={{ textDecoration: 'none' }}>
          <Button
            startIcon={<ArrowLeft size={16} />}
            sx={{
              px: 0,
              textTransform: 'none',
              color: '#64748b',
              fontWeight: 600,
              '&:hover': { bgcolor: 'transparent', color: '#1e293b' },
            }}
          >
            Volver a gestión de posiciones
          </Button>
        </Link>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0px 10px 40px rgba(15, 23, 42, 0.04)',
          bgcolor: '#f8fafc',
        }}
      >
        <Box sx={{ bgcolor: '#1d4ed8', color: '#fff', p: '40px' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 3,
              mb: 4,
            }}
          >
            <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  bgcolor: '#fff',
                  color: '#1d4ed8',
                  p: 2,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 22V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v18M6 12h4m-4 4h4m4-4h4m-4 4h4M6 8h12" />
                </svg>
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, mb: 1, letterSpacing: '-0.02em' }}
                >
                  {job.title}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center' }}
                >
                  <Typography
                    variant="body1"
                    sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}
                  >
                    {job.department}
                  </Typography>
                  <Chip
                    label={status.label}
                    size="small"
                    sx={{
                      bgcolor: '#bbf7d0',
                      color: '#166534',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      px: 1,
                    }}
                  />
                </Stack>
              </Box>
            </Stack>

            <Button
              variant="contained"
              sx={{
                textTransform: 'none',
                bgcolor: '#fff',
                color: '#1d4ed8',
                px: 4,
                py: 1.2,
                fontWeight: 700,
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              }}
            >
              Editar
            </Button>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
            }}
          >
            <InfoCard
              title="Candidatos aplicados"
              value={job.candidates ?? 0}
              icon={<Users size={20} />}
            />
            <InfoCard
              title="Ubicación"
              value={job.location ?? '-'}
              icon={<MapPin size={20} />}
            />
            <InfoCard
              title="Tipo de empleo"
              value={job.type ?? '-'}
              icon={<Users size={20} />}
            />
            <InfoCard
              title="Publicada"
              value={formattedDate}
              icon={<Calendar size={20} />}
            />
          </Box>
        </Box>

        <Box sx={{ p: '40px', bgcolor: '#f8fafc' }}>
          <Box
            sx={{
              display: 'grid',
              gap: 4,
              gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' },
              alignItems: 'start',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: '#fff',
              }}
            >
              <Stack spacing={4}>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      color: '#1e293b',
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="2.5"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    Descripción Pública
                  </Typography>

                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, mb: 1.5, color: '#334155' }}
                  >
                    Descripción del puesto
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-line',
                      color: '#475569',
                      lineHeight: 1.7,
                      fontSize: '0.95rem',
                    }}
                  >
                    {job.description}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, mb: 2, color: '#334155' }}
                  >
                    Requisitos
                  </Typography>
                  <Box
                    component="ul"
                    sx={{
                      listStyle: 'none',
                      p: 0,
                      m: 0,
                      display: 'grid',
                      gap: 2,
                    }}
                  >
                    {(job.skills ?? []).map((skill) => (
                      <Box
                        key={skill.name}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                        component="li"
                      >
                        <CircleCheck
                          size={18}
                          color="#16a34a"
                          style={{ flexShrink: 0 }}
                        />
                        <Typography
                          variant="body2"
                          sx={{ color: '#475569', fontSize: '0.95rem' }}
                        >
                          {skill.name}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, mb: 2, color: '#334155' }}
                  >
                    Responsabilidades
                  </Typography>
                  <Box
                    component="ul"
                    sx={{ p: 0, m: 0, pl: 2, display: 'grid', gap: 1.5 }}
                  >
                    {job.responsabilities.map((item) => (
                      <Typography
                        component="li"
                        key={item}
                        variant="body2"
                        sx={{
                          color: '#475569',
                          fontSize: '0.95rem',
                          lineHeight: 1.5,
                        }}
                      >
                        {item}
                      </Typography>
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, mb: 2, color: '#334155' }}
                  >
                    Beneficios
                  </Typography>
                  <Box
                    sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
                  >
                    {job.benefits.map((benefit) => (
                      <Box
                        key={benefit}
                        sx={{
                          bgcolor: '#eff6ff',
                          color: '#2563eb',
                          py: 1.2,
                          px: 2.5,
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          width: 'fit-content',
                        }}
                      >
                        {benefit}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                bgcolor: '#fff',
              }}
            >
              <Stack spacing={4}>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      mb: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      color: '#1e293b',
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Configuración Interna
                  </Typography>

                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, mb: 2, color: '#334155' }}
                  >
                    Requisitos Obligatorios
                  </Typography>
                  <Box
                    component="ul"
                    sx={{
                      listStyle: 'none',
                      p: 0,
                      m: 0,
                      display: 'grid',
                      gap: 2,
                      mb: 4,
                    }}
                  >
                    {(job.skills ?? []).map((skill) => (
                      <Box
                        key={skill.name}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                        component="li"
                      >
                        <CircleAlert size={18} color="red" />
                        <Typography
                          variant="body2"
                          sx={{ color: '#475569', fontSize: '0.95rem' }}
                        >
                          {skill.name}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, mb: 2, color: '#334155' }}
                  >
                    Requisitos Deseables
                  </Typography>
                  <Box
                    component="ul"
                    sx={{
                      listStyle: 'none',
                      p: 0,
                      m: 0,
                      display: 'grid',
                      gap: 2,
                    }}
                  >
                    {(job.skills ?? []).map((skill) => (
                      <Box
                        key={skill.name}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                        component="li"
                      >
                        <CircleCheck
                          size={18}
                          color="#3b82f6"
                          style={{ flexShrink: 0 }}
                        />
                        <Typography
                          variant="body2"
                          sx={{ color: '#475569', fontSize: '0.95rem' }}
                        >
                          {skill.name}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {job.observations && (
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, mb: 1.5, color: '#334155' }}
                    >
                      Observaciones
                    </Typography>
                    <Box
                      sx={{
                        bgcolor: '#f8fafc',
                        p: 2.5,
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#475569',
                          lineHeight: 1.6,
                          fontSize: '0.95rem',
                        }}
                      >
                        {job.observations}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {job.additionalCriteria?.length ? (
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, mb: 1.5, color: '#334155' }}
                    >
                      Criterios Adicionales
                    </Typography>
                    <Box
                      sx={{
                        bgcolor: '#f0fdf4',
                        p: 2.5,
                        borderRadius: '12px',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      <Box
                        component="ul"
                        sx={{ p: 0, m: 0, pl: 2, display: 'grid', gap: 1 }}
                      >
                        {job.additionalCriteria.map((criteria) => (
                          <Typography
                            key={criteria}
                            component="li"
                            variant="body2"
                            sx={{ color: '#166534', fontSize: '0.95rem' }}
                          >
                            {criteria}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                ) : null}
              </Stack>
            </Paper>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
