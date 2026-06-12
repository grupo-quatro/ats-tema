'use client';

import { useEffect, useState, useCallback } from 'react';
import { GMAIL_STATUS, type GmailStatus } from '@ats/shared-types';

const GMAIL_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GMAIL_REDIRECT_URI ?? 'http://localhost:3000';
const GOOGLE_OAUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ?? '';

type GmailConnectStatus = 'idle' | 'loading' | 'connected' | 'error';

interface UseGmailConnectReturn {
  status: GmailConnectStatus;
  errorMessage: string | null;
  connect: () => void;
}

function buildGoogleOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: GMAIL_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function useGmailConnect(
  gmailStatus?: GmailStatus,
): UseGmailConnectReturn {
  const [status, setStatus] = useState<GmailConnectStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sincronizar con el estado real de Firestore (via employee.gmailStatus)
  useEffect(() => {
    if (gmailStatus === GMAIL_STATUS.CONNECTED) {
      setStatus('connected');
    } else {
      setStatus('idle');
    }
  }, [gmailStatus]);

  // Escuchar el evento post-exchange de OAuthCodeHandler para feedback inmediato
  useEffect(() => {
    const onConnected = () => {
      setStatus('connected');
      setErrorMessage(null);
    };
    const onError = (e: Event) => {
      const message =
        (e as CustomEvent<string>).detail ?? 'Error al conectar Gmail';
      setErrorMessage(message);
      setStatus('error');
    };
    window.addEventListener('gmail-connected', onConnected);
    window.addEventListener('gmail-connect-error', onError);
    return () => {
      window.removeEventListener('gmail-connected', onConnected);
      window.removeEventListener('gmail-connect-error', onError);
    };
  }, []);

  const connect = useCallback(() => {
    window.location.href = buildGoogleOAuthUrl();
  }, []);

  return { status, errorMessage, connect };
}
