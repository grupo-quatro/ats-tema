'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { exchangeGmailCode } from '../../../shared/api/gmailApi';

const GMAIL_CONNECTED_KEY = 'ats-gmail-connected';
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

export function useGmailConnect(): UseGmailConnectReturn {
  const router = useRouter();

  const [status, setStatus] = useState<GmailConnectStatus>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(GMAIL_CONNECTED_KEY) === 'true'
        ? 'connected'
        : 'idle';
    }
    return 'idle';
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const onConnected = () => {
      localStorage.setItem(GMAIL_CONNECTED_KEY, 'true');
      setStatus('connected');
    };
    window.addEventListener('gmail-connected', onConnected);
    return () => window.removeEventListener('gmail-connected', onConnected);
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) return;

    setStatus('loading');
    setErrorMessage(null);

    const cleanUrl = () => {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('code');
      currentUrl.searchParams.delete('scope');
      currentUrl.searchParams.delete('authuser');
      currentUrl.searchParams.delete('prompt');
      router.replace(currentUrl.pathname + (currentUrl.search || ''));
    };

    exchangeGmailCode({ code, redirectUri: GMAIL_REDIRECT_URI })
      .then(() => {
        console.log('[GmailConnect] exchange OK');
        localStorage.setItem(GMAIL_CONNECTED_KEY, 'true');
        setStatus('connected');
        cleanUrl();
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Error desconocido';
        console.error('[GmailConnect] exchange FAILED', message);
        setErrorMessage(message);
        setStatus('error');
        cleanUrl();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(() => {
    window.location.href = buildGoogleOAuthUrl();
  }, []);

  return { status, errorMessage, connect };
}
