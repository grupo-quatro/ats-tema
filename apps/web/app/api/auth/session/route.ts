import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '../../../shared/lib/firebaseAdmin';

const SESSION_COOKIE = 'ats-session';
const ROLE_COOKIE = 'ats-role';
const SESSION_EXPIRY_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export async function POST(request: NextRequest) {
  try {
    const { idToken, role } = (await request.json()) as {
      idToken: string;
      role?: string | null;
    };

    if (!idToken) {
      return NextResponse.json(
        { error: 'idToken is required' },
        { status: 400 },
      );
    }

    const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

    let cookieValue: string;

    if (useEmulators) {
      // En emulador usamos el idToken directamente como valor de cookie
      cookieValue = idToken;
    } else {
      const sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn: SESSION_EXPIRY_MS,
      });
      cookieValue = sessionCookie;
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, cookieValue, {
      httpOnly: true,
      secure: !useEmulators,
      sameSite: 'strict',
      maxAge: SESSION_EXPIRY_MS / 1000,
      path: '/',
    });
    if (role) {
      response.cookies.set(ROLE_COOKIE, role, {
        httpOnly: false,
        secure: !useEmulators,
        sameSite: 'strict',
        maxAge: SESSION_EXPIRY_MS / 1000,
        path: '/',
      });
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  response.cookies.set(ROLE_COOKIE, '', {
    httpOnly: false,
    secure: true,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
