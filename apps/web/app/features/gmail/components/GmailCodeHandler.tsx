'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { exchangeGmailCode } from '../../../shared/api/gmailApi';

const GMAIL_CONNECTED_KEY = 'ats-gmail-connected';
const GMAIL_REDIRECT_URI =
  process.env.NEXT_PUBLIC_GMAIL_REDIRECT_URI ?? 'http://localhost:3000';

export default function GmailCodeHandler() {
  const router = useRouter();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) return;

    const cleanUrl = () => {
      const url = new URL(window.location.href);
      ['code', 'scope', 'authuser', 'prompt'].forEach((p) =>
        url.searchParams.delete(p),
      );
      router.replace(url.pathname + (url.search || ''));
    };

    console.log(
      '[GmailCodeHandler] exchanging code, redirectUri:',
      GMAIL_REDIRECT_URI,
    );
    exchangeGmailCode({ code, redirectUri: GMAIL_REDIRECT_URI })
      .then(() => {
        localStorage.setItem(GMAIL_CONNECTED_KEY, 'true');
        cleanUrl();
        window.dispatchEvent(new Event('gmail-connected'));
      })
      .catch((err: unknown) => {
        console.error('[GmailCodeHandler] exchange failed:', err);
        cleanUrl();
      });
  }, [router]);

  return null;
}
