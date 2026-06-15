'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import { LogIn, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../shared/lib/firebase';
import { useAuth, DomainNotAllowedError } from '../shared/lib/authContext';

const IS_DEV = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

type DevRole = 'admin' | 'recruiter' | 'area_leader';

const DEV_ROLES: Array<{ role: DevRole; label: string }> = [
  { role: 'admin', label: 'Admin' },
  { role: 'recruiter', label: 'Recruiter' },
  { role: 'area_leader', label: 'Área Líder' },
];

function getSafeReturnTo(returnTo: string | null): string {
  if (returnTo && returnTo.startsWith('/dashboard')) return returnTo;
  return '/dashboard/positions';
}

function LoginContent() {
  const { user, role, authReady, isPendingApproval, signInWithGoogle } =
    useAuth();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (user && role) {
      window.location.replace(returnTo);
    }
    if (user && isPendingApproval) {
      const selectRoleUrl =
        returnTo !== '/dashboard/positions'
          ? `/login/select-role?returnTo=${encodeURIComponent(returnTo)}`
          : '/login/select-role';
      window.location.replace(selectRoleUrl);
    }
  }, [user, role, isPendingApproval, returnTo]);

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

  if (user && isPendingApproval) {
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
            Redirigiendo...
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
      // El useEffect maneja el redirect según el estado (role vs isPendingApproval)
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

  async function handleAdminSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdminLoading(true);
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      window.location.replace(returnTo);
    } catch (err) {
      console.error('Admin sign in error:', err);
      setError('Credenciales incorrectas. Verificá tu email y contraseña.');
    } finally {
      setAdminLoading(false);
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
          <Stack spacing={3}>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 500, color: 'text.primary', mb: 0.5 }}
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
              disabled={loading || adminLoading}
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

            <Box>
              <Button
                variant="text"
                size="small"
                color="inherit"
                onClick={() => setAdminOpen((prev) => !prev)}
                startIcon={<ShieldCheck size={16} />}
                endIcon={
                  adminOpen ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )
                }
                sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}
              >
                Acceso administrador
              </Button>

              <Collapse in={adminOpen}>
                <Box
                  component="form"
                  onSubmit={(e) => void handleAdminSignIn(e)}
                  sx={{ mt: 2 }}
                >
                  <Stack spacing={2}>
                    <TextField
                      variant="outlined"
                      fullWidth
                      label="Email"
                      type="email"
                      size="small"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      disabled={adminLoading}
                      required
                    />
                    <TextField
                      variant="outlined"
                      fullWidth
                      label="Contraseña"
                      type="password"
                      size="small"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      disabled={adminLoading}
                      required
                    />
                    <Button
                      type="submit"
                      variant="outlined"
                      fullWidth
                      disabled={adminLoading || loading}
                      startIcon={
                        adminLoading ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <ShieldCheck size={16} />
                        )
                      }
                    >
                      {adminLoading ? 'Ingresando...' : 'Ingresar como admin'}
                    </Button>
                  </Stack>
                </Box>
              </Collapse>
            </Box>

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
                      disabled={loading || adminLoading}
                      onClick={() => handleSignIn(devRole)}
                    >
                      {label}
                    </Button>
                  ))}
                </Stack>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
