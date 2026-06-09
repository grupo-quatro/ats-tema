'use client';

import { useEffect, useState, useCallback } from 'react';

const CALENDAR_CONNECTED_KEY = 'ats-calendar-connected';
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

export function useCalendarConnect(): UseCalendarConnectReturn {
  const [status, setStatus] = useState<CalendarConnectStatus>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CALENDAR_CONNECTED_KEY) === 'true'
        ? 'connected'
        : 'idle';
    }
    return 'idle';
  });
  const [errorMessage] = useState<string | null>(null);

  useEffect(() => {
    const onConnected = () => {
      localStorage.setItem(CALENDAR_CONNECTED_KEY, 'true');
      setStatus('connected');
    };
    window.addEventListener('calendar-connected', onConnected);
    return () => window.removeEventListener('calendar-connected', onConnected);
  }, []);

  const connect = useCallback(() => {
    window.location.href = buildGoogleCalendarOAuthUrl();
  }, []);

  return { status, errorMessage, connect };
}

export { CALENDAR_REDIRECT_URI, CALENDAR_CONNECTED_KEY };
