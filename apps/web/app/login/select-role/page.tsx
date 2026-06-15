'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { Users, Briefcase } from 'lucide-react';
import { useAuth } from '../../shared/lib/authContext';

interface RoleOption {
  role: 'hr' | 'area_leader';
  label: string;
  description: string;
  icon: React.ReactNode;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'hr',
    label: 'Recruiter',
    description: 'Gestión de candidatos, entrevistas y pipeline de selección.',
    icon: <Users size={40} />,
  },
  {
    role: 'area_leader',
    label: 'Área Líder',
    description:
      'Revisión de candidatos y decisiones de contratación para tu área.',
    icon: <Briefcase size={40} />,
  },
];

function getSafeReturnTo(returnTo: string | null): string {
  if (returnTo && returnTo.startsWith('/dashboard')) return returnTo;
  return '/dashboard/positions';
}

function SelectRoleContent() {
  const { user, needsRoleSelection, completeRoleOnboarding } = useAuth();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'));
  const [loading, setLoading] = useState<'hr' | 'area_leader' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If the user already has a role, the middleware redirects them away.
  // This handles the edge case where the user lands here with a role already set.
  if (!user || !needsRoleSelection) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  async function handleRoleSelect(role: 'hr' | 'area_leader') {
    setError(null);
    setLoading(role);
    try {
      await completeRoleOnboarding(role);
      window.location.replace(returnTo);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo asignar el rol.';
      setError(message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 560 }}>
        <Stack spacing={4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h5"
              sx={{ fontWeight: 500, color: 'text.primary', mb: 0.5 }}
            >
              Elegí tu rol
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Seleccioná cómo vas a usar el sistema. Esta elección no se puede
              modificar después.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {ROLE_OPTIONS.map((option) => {
              const isLoading = loading === option.role;
              const isDisabled = loading !== null;

              return (
                <Card
                  key={option.role}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    opacity: isDisabled && !isLoading ? 0.5 : 1,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    '&:hover': isDisabled
                      ? {}
                      : {
                          borderColor: 'primary.main',
                          boxShadow: 2,
                        },
                  }}
                >
                  <CardActionArea
                    disabled={isDisabled}
                    onClick={() => handleRoleSelect(option.role)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent sx={{ p: 3, textAlign: 'center' }}>
                      <Stack spacing={2} sx={{ alignItems: 'center' }}>
                        <Box
                          sx={{
                            color: isLoading ? 'text.disabled' : 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 48,
                          }}
                        >
                          {isLoading ? (
                            <CircularProgress size={32} />
                          ) : (
                            option.icon
                          )}
                        </Box>

                        <Box>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 500, color: 'text.primary' }}
                          >
                            {option.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.5 }}
                          >
                            {option.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

export default function SelectRolePage() {
  return (
    <Suspense fallback={null}>
      <SelectRoleContent />
    </Suspense>
  );
}
