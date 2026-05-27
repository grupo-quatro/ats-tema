import { getAuth } from 'firebase/auth';

export async function getToken(): Promise<string> {
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
  if (useEmulators) return 'dev-recruiter';

  const user = getAuth().currentUser;
  if (!user) throw new Error('Usuario no autenticado');
  return user.getIdToken();
}
