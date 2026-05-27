import type { EmployeeRole } from '@ats/shared-types';
import { auth } from './firebaseAdmin';

export class HttpAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HttpAuthError';
  }
}

type HttpRequestLike = {
  header(name: string): string | undefined;
};

export interface AuthenticatedUser {
  uid: string;
  role: EmployeeRole | null;
}

export async function requireAuthenticatedUser(
  request: HttpRequestLike,
): Promise<AuthenticatedUser> {
  const authorization = request.header('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpAuthError('Unauthorized.');
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    throw new HttpAuthError('Unauthorized.');
  }

  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    if (token === 'dev-admin') {
      return { uid: 'admin-dev', role: 'admin' };
    }
    if (token === 'dev-recruiter') {
      return { uid: 'recruiter-dev', role: 'hr' };
    }
    if (token === 'dev-hiring-manager') {
      return { uid: 'hiring-manager-dev', role: 'hiring_manager' };
    }
    if (token === 'dev-candidate') {
      return { uid: 'candidate-dev', role: null };
    }
  }

  const decodedToken = await auth.verifyIdToken(token);

  const uid = decodedToken.uid || decodedToken.user_id || decodedToken.sub;

  if (!uid) {
    throw new HttpAuthError('Unauthorized.');
  }

  return { uid, role: (decodedToken['role'] as EmployeeRole) ?? null };
}
