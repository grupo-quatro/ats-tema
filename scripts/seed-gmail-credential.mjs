#!/usr/bin/env node
/**
 * Inyecta gmailCredential en el Emulator llamando a la Cloud Function seedGmailCredential.
 *
 * Requiere variables de entorno:
 *   SEED_GMAIL_UID           — Firebase UID del usuario (recruiter-dev por defecto)
 *   SEED_GMAIL_ACCESS_TOKEN  — OAuth2 access token de Google
 *   SEED_GMAIL_REFRESH_TOKEN — OAuth2 refresh token de Google
 *
 * Cómo obtener los tokens: conectar Gmail desde la UI del dashboard,
 * copiar access/refresh token del payload que devuelve exchangeGmailCode.
 *
 * Correr desde la raíz:
 *   node --env-file=apps/web/.env.local scripts/seed-gmail-credential.mjs
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'ats-tema-ort';
const REGION     = process.env.FUNCTIONS_REGION ?? 'us-central1';
const PORT       = process.env.FUNCTIONS_EMULATOR_PORT ?? '5001';

const UID           = process.env.SEED_GMAIL_UID ?? 'recruiter-dev';
const ACCESS_TOKEN  = process.env.SEED_GMAIL_ACCESS_TOKEN;
const REFRESH_TOKEN = process.env.SEED_GMAIL_REFRESH_TOKEN;

if (!ACCESS_TOKEN || !REFRESH_TOKEN) {
  console.error('❌ Faltan variables de entorno: SEED_GMAIL_ACCESS_TOKEN, SEED_GMAIL_REFRESH_TOKEN');
  process.exit(1);
}

const url = `http://127.0.0.1:${PORT}/${PROJECT_ID}/${REGION}/seedGmailCredential`;

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ uid: UID, accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN }),
});

if (!res.ok) {
  const body = await res.json().catch(() => ({}));
  console.error(`❌ seedGmailCredential falló (${res.status}):`, body);
  process.exit(1);
}

console.log(`✅ gmailCredential inyectado para users/${UID}`);
