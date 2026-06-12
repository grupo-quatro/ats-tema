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

function detectOAuthType(
  scope: string,
): 'google' | 'gmail' | 'calendar' | null {
  const hasGmail = scope.includes('gmail') || scope.includes('mail.google.com');
  const hasCalendar = scope.includes('calendar');
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
          window.dispatchEvent(new Event('calendar-connected'));
          registerCalendarWatch().catch((err: unknown) => {
            console.error(
              '[OAuthCodeHandler] registerCalendarWatch failed:',
              err,
            );
          });
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Error desconocido';
          console.error('[OAuthCodeHandler] Google exchange failed:', message);
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
          window.dispatchEvent(new Event('calendar-connected'));
          registerCalendarWatch().catch((err: unknown) => {
            console.error(
              '[OAuthCodeHandler] registerCalendarWatch failed:',
              err,
            );
          });
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Error desconocido';
          console.error(
            '[OAuthCodeHandler] Calendar exchange failed:',
            message,
          );
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
