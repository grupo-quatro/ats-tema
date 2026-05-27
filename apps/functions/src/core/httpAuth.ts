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

export async function requireAuthenticatedUser(
  request: HttpRequestLike,
): Promise<string> {
  const authorization = request.header('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpAuthError('Unauthorized.');
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    throw new HttpAuthError('Unauthorized.');
  }

  if (process.env.FUNCTIONS_EMULATOR === 'true' && token === 'dev-recruiter') {
    return 'recruiter-dev';
  }

  if (process.env.FUNCTIONS_EMULATOR === 'true' && token === 'dev-candidate') {
    return 'candidate-dev';
  }

  const decodedToken = await auth.verifyIdToken(token);

  return (
    decodedToken.uid ||
    decodedToken.user_id ||
    decodedToken.sub ||
    (() => {
      throw new HttpAuthError('Unauthorized.');
    })()
  );
}
