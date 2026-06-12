'use client';

import { useEffect, useState, useCallback } from 'react';
import { GMAIL_STATUS, type GmailStatus } from '@ats/shared-types';

const CALENDAR_REDIRECT_URI =
  process.env.NEXT_PUBLIC_CALENDAR_REDIRECT_URI ?? 'http://localhost:3000';
const GOOGLE_OAUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ?? '';

type CalendarConnectStatus = 'idle' | 'loading' | 'connected' | 'error';

interface UseCalendarConnectReturn {
  status: CalendarConnectStatus;
  errorMessage: string | null;
  connect: () => void;
}

function buildGoogleCalendarOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: CALENDAR_REDIRECT_URI,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function useCalendarConnect(
  calendarStatus?: GmailStatus,
): UseCalendarConnectReturn {
  const [status, setStatus] = useState<CalendarConnectStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sincronizar con el estado real de Firestore (via employee.calendarStatus)
  useEffect(() => {
    if (calendarStatus === GMAIL_STATUS.CONNECTED) {
      setStatus('connected');
    } else {
      setStatus('idle');
    }
  }, [calendarStatus]);

  // Escuchar el evento post-exchange de OAuthCodeHandler para feedback inmediato
  useEffect(() => {
    const onConnected = () => {
      setStatus('connected');
      setErrorMessage(null);
    };
    const onError = (e: Event) => {
      const message =
        (e as CustomEvent<string>).detail ??
        'Error al conectar Google Calendar';
      setErrorMessage(message);
      setStatus('error');
    };
    window.addEventListener('calendar-connected', onConnected);
    window.addEventListener('calendar-connect-error', onError);
    return () => {
      window.removeEventListener('calendar-connected', onConnected);
      window.removeEventListener('calendar-connect-error', onError);
    };
  }, []);

  const connect = useCallback(() => {
    window.location.href = buildGoogleCalendarOAuthUrl();
  }, []);

  return { status, errorMessage, connect };
}

export { CALENDAR_REDIRECT_URI };
