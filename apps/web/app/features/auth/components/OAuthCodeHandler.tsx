'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { exchangeGmailCode } from '../../../shared/api/gmailApi';
import {
  exchangeCalendarCode,
  registerCalendarWatch,
} from '../../../shared/api/calendarOAuthApi';
import {
  exchangeGoogleCode,
  GOOGLE_REDIRECT_URI_VALUE,
} from '../../../shared/api/googleOAuthApi';

const GMAIL_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GMAIL_REDIRECT_URI ?? 'http://localhost:3000';
const CALENDAR_REDIRECT_URI =
  process.env.NEXT_PUBLIC_CALENDAR_REDIRECT_URI ?? 'http://localhost:3000';

export const ALLOWED_GOOGLE_SCOPE_HOSTS = new Set([
  'mail.google.com',
  'www.googleapis.com',
]);

export function parseTrustedGoogleScope(
  token: string,
): { host: string; path: string } | null {
  try {
    const { hostname, pathname } = new URL(token);
    return ALLOWED_GOOGLE_SCOPE_HOSTS.has(hostname)
      ? { host: hostname, path: pathname }
      : null;
  } catch {
    return null;
  }
}

export function detectOAuthType(
  scope: string,
): 'google' | 'gmail' | 'calendar' | null {
  let hasGmail = false;
  let hasCalendar = false;

  for (const token of scope.split(/\s+/).filter(Boolean)) {
    const parsed = parseTrustedGoogleScope(token);
    if (!parsed) continue;
    if (
      parsed.host === 'mail.google.com' ||
      parsed.path.startsWith('/auth/gmail')
    )
      hasGmail = true;
    if (parsed.path.startsWith('/auth/calendar')) hasCalendar = true;
  }

  if (hasGmail && hasCalendar) return 'google';
  if (hasGmail) return 'gmail';
  if (hasCalendar) return 'calendar';
  return null;
}

export default function OAuthCodeHandler() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    const scope = params.get('scope') ?? '';
    const oauthType = detectOAuthType(scope);

    if (!oauthType) {
      console.warn('[OAuthCodeHandler] scope no reconocido:', scope);
      return;
    }

    const cleanUrl = () => {
      const url = new URL(window.location.href);
      ['code', 'scope', 'authuser', 'prompt'].forEach((p) =>
        url.searchParams.delete(p),
      );
      router.replace(url.pathname + (url.search || ''));
    };

    if (oauthType === 'google') {
      exchangeGoogleCode({ code, redirectUri: GOOGLE_REDIRECT_URI_VALUE })
        .then(() => {
          cleanUrl();
          window.dispatchEvent(new Event('gmail-connected'));
          return registerCalendarWatch();
        })
        .then(() => {
          window.dispatchEvent(new Event('calendar-connected'));
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Error desconocido';
          console.error('[OAuthCodeHandler] Google OAuth failed:', message);
          cleanUrl();
          window.dispatchEvent(
            new CustomEvent('gmail-connect-error', { detail: message }),
          );
          window.dispatchEvent(
            new CustomEvent('calendar-connect-error', { detail: message }),
          );
        });
    } else if (oauthType === 'gmail') {
      exchangeGmailCode({ code, redirectUri: GMAIL_REDIRECT_URI })
        .then(() => {
          cleanUrl();
          window.dispatchEvent(new Event('gmail-connected'));
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Error desconocido';
          console.error('[OAuthCodeHandler] Gmail exchange failed:', message);
          cleanUrl();
          window.dispatchEvent(
            new CustomEvent('gmail-connect-error', { detail: message }),
          );
        });
    } else {
      exchangeCalendarCode({ code, redirectUri: CALENDAR_REDIRECT_URI })
        .then(() => {
          cleanUrl();
          return registerCalendarWatch();
        })
        .then(() => {
          window.dispatchEvent(new Event('calendar-connected'));
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Error desconocido';
          console.error('[OAuthCodeHandler] Calendar OAuth failed:', message);
          cleanUrl();
          window.dispatchEvent(
            new CustomEvent('calendar-connect-error', { detail: message }),
          );
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
