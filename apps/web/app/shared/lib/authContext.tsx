'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { EMPLOYEE_ROLES, type EmployeeRole } from '@ats/shared-types';
import { auth, googleProvider } from './firebase';
import { getFunctionUrl } from './functionsUrl';

const ALLOWED_DOMAIN = 'temaconsulting.com.ar';

// TODO: eliminar estos emails de prueba antes de deploy a producción
const DEV_WHITELIST_EMAILS = ['jamija.webdev@gmail.com'];

function isEmailAllowed(email: string): boolean {
  if (email.endsWith(`@${ALLOWED_DOMAIN}`)) return true;
  // TODO: eliminar whitelist de prueba antes de producción
  if (DEV_WHITELIST_EMAILS.includes(email)) return true;
  return false;
}

interface AuthContextValue {
  user: User | null;
  role: EmployeeRole | null;
  /** UID que usa el backend (en emulador: recruiter-dev, admin-dev, etc.) */
  callerUid: string | null;
  isPendingApproval: boolean;
  /** true cuando el usuario está autenticado pero aún no eligió un rol */
  needsRoleSelection: boolean;
  /** true después del primer evento de onAuthStateChanged */
  authReady: boolean;
  loading: boolean;
  signInWithGoogle: (devRole?: DevRole) => Promise<void>;
  signOut: () => Promise<void>;
  completeRoleOnboarding: (role: 'hr' | 'area_leader') => Promise<void>;
}

type DevRole = 'admin' | 'recruiter' | 'area_leader';

const DEV_ACCOUNTS: Record<DevRole, { email: string; token: string }> = {
  admin: { email: 'admin@tema.dev', token: 'dev-admin' },
  recruiter: { email: 'recruiter@tema.dev', token: 'dev-recruiter' },
  area_leader: { email: 'arealeader@tema.dev', token: 'dev-area-leader' },
};
const DEV_PASSWORD = 'pass123';

const AuthContext = createContext<AuthContextValue | null>(null);

const DEV_CALLER_UID_BY_TOKEN: Record<string, string> = {
  'dev-admin': 'admin-dev',
  'dev-recruiter': 'recruiter-dev',
  'dev-area-leader': 'area-leader-dev',
};

function getDevRoleFromToken(token: string | null): EmployeeRole | null {
  if (token === 'dev-admin') return EMPLOYEE_ROLES.ADMIN;
  if (token === 'dev-recruiter') return EMPLOYEE_ROLES.HR;
  if (token === 'dev-area-leader') return EMPLOYEE_ROLES.AREA_LEADER;
  return null;
}

function resolveCallerUid(firebaseUid: string, useEmulators: boolean): string {
  if (!useEmulators) return firebaseUid;
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('ats-dev-token')
      : null;
  if (token && DEV_CALLER_UID_BY_TOKEN[token]) {
    return DEV_CALLER_UID_BY_TOKEN[token];
  }
  return firebaseUid;
}

async function setSessionCookie(
  idToken: string,
  role?: EmployeeRole | null,
): Promise<void> {
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, role }),
  });

  if (!response.ok) {
    throw new Error('No se pudo crear la sesiÃ³n de usuario.');
  }
}

async function clearSessionCookie(): Promise<void> {
  await fetch('/api/auth/session', { method: 'DELETE' });
}

async function callEnsureEmployee(user: User, idToken: string): Promise<void> {
  await fetch(getFunctionUrl('ensureEmployee'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    }),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [callerUid, setCallerUid] = useState<string | null>(null);
  const [role, setRole] = useState<EmployeeRole | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const tokenResult = await firebaseUser.getIdTokenResult();
          const devRole = useEmulators
            ? getDevRoleFromToken(localStorage.getItem('ats-dev-token'))
            : null;
          const claimedRole =
            devRole ??
            (tokenResult.claims['role'] as EmployeeRole | undefined) ??
            null;
          if (claimedRole) {
            await setSessionCookie(
              await firebaseUser.getIdToken(),
              claimedRole,
            );
          }
          setUser(firebaseUser);
          setCallerUid(resolveCallerUid(firebaseUser.uid, useEmulators));
          setRole(claimedRole);
          setIsPendingApproval(!claimedRole);
        } else if (!auth.currentUser) {
          setUser(null);
          setCallerUid(null);
          setRole(null);
          setIsPendingApproval(false);
        }
      } finally {
        setAuthReady(true);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [useEmulators]);

  const signInWithGoogle = useCallback(
    async (devRole: DevRole = 'recruiter') => {
      if (useEmulators) {
        const { email, token } = DEV_ACCOUNTS[devRole];
        const credential = await signInWithEmailAndPassword(
          auth,
          email,
          DEV_PASSWORD,
        );
        localStorage.setItem('ats-dev-token', token);
        const role = getDevRoleFromToken(token);
        const idToken = await credential.user.getIdToken();
        await setSessionCookie(idToken, role);
        setUser(credential.user);
        setCallerUid(resolveCallerUid(credential.user.uid, useEmulators));
        setRole(role);
        setIsPendingApproval(false);
        setAuthReady(true);
        setLoading(false);
        return;
      }

      const credential = await signInWithPopup(auth, googleProvider);
      const { user: firebaseUser } = credential;

      if (!firebaseUser.email || !isEmailAllowed(firebaseUser.email)) {
        await firebaseSignOut(auth);
        throw new DomainNotAllowedError(firebaseUser.email ?? '');
      }

      const tokenResult = await firebaseUser.getIdTokenResult();
      const idToken = await firebaseUser.getIdToken();
      const role =
        (tokenResult.claims['role'] as EmployeeRole | undefined) ?? null;
      await setSessionCookie(idToken, role);

      // Registrar en Firestore si es el primer login (sin rol aun)
      if (!tokenResult.claims['role']) {
        await callEnsureEmployee(firebaseUser, idToken);
      }
    },
    [useEmulators],
  );

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    if (useEmulators) {
      localStorage.removeItem('ats-dev-token');
    }
    await clearSessionCookie();
  }, [useEmulators]);

  const completeRoleOnboarding = useCallback(
    async (selectedRole: 'hr' | 'area_leader') => {
      if (!user) throw new Error('No hay usuario autenticado.');

      const currentToken = await user.getIdToken();

      const res = await fetch('/api/auth/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'No se pudo asignar el rol.');
      }

      // Force Firebase to re-read custom claims
      await user.getIdTokenResult(true);
      const newToken = await user.getIdToken(true);

      await setSessionCookie(newToken, selectedRole);

      setRole(selectedRole as EmployeeRole);
      setIsPendingApproval(false);
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        callerUid,
        role,
        isPendingApproval,
        needsRoleSelection: isPendingApproval,
        authReady,
        loading,
        signInWithGoogle,
        signOut,
        completeRoleOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export class DomainNotAllowedError extends Error {
  constructor(email: string) {
    super(`El email ${email} no pertenece a un dominio autorizado.`);
    this.name = 'DomainNotAllowedError';
  }
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
