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
import type { EmployeeRole } from '@ats/shared-types';
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
  isPendingApproval: boolean;
  loading: boolean;
  signInWithGoogle: (devRole?: DevRole) => Promise<void>;
  signOut: () => Promise<void>;
}

type DevRole = 'admin' | 'recruiter' | 'hiring_manager';

const DEV_ACCOUNTS: Record<DevRole, { email: string; token: string }> = {
  admin: { email: 'admin@tema.dev', token: 'dev-admin' },
  recruiter: { email: 'recruiter@tema.dev', token: 'dev-recruiter' },
  hiring_manager: { email: 'hiring@tema.dev', token: 'dev-hiring-manager' },
};
const DEV_PASSWORD = 'pass123';

const AuthContext = createContext<AuthContextValue | null>(null);

async function setSessionCookie(idToken: string): Promise<void> {
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
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
  const [role, setRole] = useState<EmployeeRole | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        const claimedRole = tokenResult.claims['role'] as
          | EmployeeRole
          | undefined;
        setUser(firebaseUser);
        setRole(claimedRole ?? null);
        setIsPendingApproval(!claimedRole);
      } else {
        setUser(null);
        setRole(null);
        setIsPendingApproval(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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
        const idToken = await credential.user.getIdToken();
        await setSessionCookie(idToken);
        return;
      }

      const credential = await signInWithPopup(auth, googleProvider);
      const { user: firebaseUser } = credential;

      if (!firebaseUser.email || !isEmailAllowed(firebaseUser.email)) {
        await firebaseSignOut(auth);
        throw new DomainNotAllowedError(firebaseUser.email ?? '');
      }

      const idToken = await firebaseUser.getIdToken();
      await setSessionCookie(idToken);

      // Registrar en Firestore si es el primer login (sin rol aún)
      const tokenResult = await firebaseUser.getIdTokenResult();
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

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isPendingApproval,
        loading,
        signInWithGoogle,
        signOut,
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
