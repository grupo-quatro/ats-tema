'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { useAuth, DomainNotAllowedError } from '../shared/lib/authContext';

const IS_DEV = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

type DevRole = 'admin' | 'recruiter' | 'hiring_manager';

const DEV_ROLES: Array<{ role: DevRole; label: string }> = [
  { role: 'admin', label: 'Admin' },
  { role: 'recruiter', label: 'Recruiter' },
  { role: 'hiring_manager', label: 'Management' },
];

function PendingApprovalCard({
  userName,
  userEmail,
  userPhoto,
  onSignOut,
}: {
  userName: string | null;
  userEmail: string | null;
  userPhoto: string | null;
  onSignOut: () => void;
}) {
  return (
    <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center' }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: 'warning.light',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Clock size={28} color="#b45309" />
      </Box>

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          Acceso pendiente de aprobación
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tu cuenta fue registrada correctamente. Un administrador debe
          asignarte un rol antes de que puedas ingresar al sistema.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: 'grey.50',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          px: 2,
          py: 1.5,
          width: '100%',
        }}
      >
        <Avatar src={userPhoto ?? undefined} sx={{ width: 36, height: 36 }} />
        <Box sx={{ textAlign: 'left', overflow: 'hidden' }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
            {userName ?? userEmail}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {userEmail}
          </Typography>
        </Box>
      </Box>

      <Button
        variant="outlined"
        size="small"
        startIcon={<LogOut size={16} />}
        onClick={onSignOut}
        color="inherit"
        sx={{ color: 'text.secondary' }}
      >
        Salir
      </Button>
    </Stack>
  );
}

export default function LoginPage() {
  const {
    user,
    role,
    authReady,
    isPendingApproval,
    signInWithGoogle,
    signOut,
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && role) {
      window.location.replace('/dashboard/positions');
    }
  }, [user, role]);

  // Si ya tiene rol, redirigir al dashboard
  if (user && role) {
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
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            Redirigiendo al dashboard...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!authReady) {
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
        <CircularProgress size={28} />
      </Box>
    );
  }

  async function handleSignIn(devRole?: DevRole) {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle(devRole);
      window.location.replace('/dashboard/positions');
    } catch (err) {
      if (err instanceof DomainNotAllowedError) {
        setError(
          'Tu cuenta de Google no pertenece al dominio autorizado. Usá tu cuenta corporativa.',
        );
      } else {
        console.error('Sign in error:', err);
        setError('No se pudo iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
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
      <Card
        variant="outlined"
        sx={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {isPendingApproval && user ? (
            <PendingApprovalCard
              userName={user.displayName}
              userEmail={user.email}
              userPhoto={user.photoURL}
              onSignOut={signOut}
            />
          ) : (
            <Stack spacing={3}>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}
                >
                  ATS · Tema Consulting
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Acceso para equipos internos
                </Typography>
              </Box>

              <Divider />

              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                onClick={() => handleSignIn()}
                startIcon={
                  loading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <LogIn size={18} />
                  )
                }
                sx={{ py: 1.5 }}
              >
                {loading ? 'Iniciando sesión...' : 'Continuar con Google'}
              </Button>

              {IS_DEV && (
                <>
                  <Divider>
                    <Typography variant="caption" color="text.secondary">
                      Dev Mode
                    </Typography>
                  </Divider>
                  <Stack direction="row" spacing={1}>
                    {DEV_ROLES.map(({ role: devRole, label }) => (
                      <Button
                        key={devRole}
                        variant="outlined"
                        size="small"
                        fullWidth
                        disabled={loading}
                        onClick={() => handleSignIn(devRole)}
                      >
                        {label}
                      </Button>
                    ))}
                  </Stack>
                </>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
