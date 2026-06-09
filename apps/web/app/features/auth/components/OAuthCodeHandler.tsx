'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { exchangeGmailCode } from '../../../shared/api/gmailApi';
import { exchangeCalendarCode } from '../../../shared/api/calendarOAuthApi';

const GMAIL_CONNECTED_KEY = 'ats-gmail-connected';
const CALENDAR_CONNECTED_KEY = 'ats-calendar-connected';

const GMAIL_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GMAIL_REDIRECT_URI ?? 'http://localhost:3000';
const CALENDAR_REDIRECT_URI =
  process.env.NEXT_PUBLIC_CALENDAR_REDIRECT_URI ?? 'http://localhost:3000';

function detectOAuthType(scope: string): 'gmail' | 'calendar' | null {
  if (scope.includes('gmail') || scope.includes('mail.google.com')) {
    return 'gmail';
  }
  if (scope.includes('calendar')) {
    return 'calendar';
  }
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
      console.warn(
        '[OAuthCodeHandler] código recibido pero scope no reconocido:',
        scope,
      );
      return;
    }

    const cleanUrl = () => {
      const url = new URL(window.location.href);
      ['code', 'scope', 'authuser', 'prompt'].forEach((p) =>
        url.searchParams.delete(p),
      );
      router.replace(url.pathname + (url.search || ''));
    };

    if (oauthType === 'gmail') {
      console.log(
        '[OAuthCodeHandler] intercambiando código de Gmail, redirectUri:',
        GMAIL_REDIRECT_URI,
      );
      exchangeGmailCode({ code, redirectUri: GMAIL_REDIRECT_URI })
        .then(() => {
          localStorage.setItem(GMAIL_CONNECTED_KEY, 'true');
          cleanUrl();
          window.dispatchEvent(new Event('gmail-connected'));
        })
        .catch((err: unknown) => {
          console.error('[OAuthCodeHandler] Gmail exchange failed:', err);
          cleanUrl();
        });
    } else {
      console.log(
        '[OAuthCodeHandler] intercambiando código de Calendar, redirectUri:',
        CALENDAR_REDIRECT_URI,
      );
      exchangeCalendarCode({ code, redirectUri: CALENDAR_REDIRECT_URI })
        .then(() => {
          localStorage.setItem(CALENDAR_CONNECTED_KEY, 'true');
          cleanUrl();
          window.dispatchEvent(new Event('calendar-connected'));
        })
        .catch((err: unknown) => {
          console.error('[OAuthCodeHandler] Calendar exchange failed:', err);
          cleanUrl();
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
