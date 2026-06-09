import { type NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'ats-session';
const ROLE_COOKIE = 'ats-role';
const INTERNAL_ROLES = new Set(['admin', 'hr', 'area_leader', 'tech_lead']);
const INTERNAL_HOME = '/dashboard/positions';
const CANDIDATE_PATHS = ['/', '/jobs', '/postulation'];

function isCandidatePath(pathname: string): boolean {
  return CANDIDATE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isInternalRole(role: string | undefined): boolean {
  return role ? INTERNAL_ROLES.has(role) : false;
}

function getRoleFromJwt(token: string | undefined): string | undefined {
  if (!token) return undefined;

  try {
    const payload = token.split('.')[1];
    if (!payload) return undefined;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized)) as { role?: string };
    return decoded.role;
  } catch {
    return undefined;
  }
}

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE);
  const role =
    request.cookies.get(ROLE_COOKIE)?.value ?? getRoleFromJwt(session?.value);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && isInternalRole(role) && isCandidatePath(pathname)) {
    const target = new URL(INTERNAL_HOME, request.url);
    // Preservar ?code= para callbacks OAuth (Gmail, Calendar)
    const code = request.nextUrl.searchParams.get('code');
    if (code) target.searchParams.set('code', code);
    return NextResponse.redirect(target);
  }

  // No redirigir /login → dashboard aquí: el cliente valida Firebase y evita
  // loop con el layout del dashboard (cookie presente pero user aún null).

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/jobs/:path*',
    '/postulation/:path*',
    '/dashboard/:path*',
    '/login',
  ],
};
