#!/usr/bin/env node
/**
 * Inyecta gmailCredential en Firestore Emulator usando Admin SDK (bypasea security rules).
 *
 * Requiere variables de entorno:
 *   SEED_GMAIL_UID           — Firebase UID del usuario
 *   SEED_GMAIL_ACCESS_TOKEN  — OAuth2 access token de Google
 *   SEED_GMAIL_REFRESH_TOKEN — OAuth2 refresh token de Google
 *
 * Cómo obtener los tokens: conectar Gmail desde la UI del dashboard (Sidebar → Conectar Gmail),
 * luego copiarlos de Firestore → users/{uid}.gmailCredential
 *
 * Correr desde la raíz:
 *   node --env-file=.env.local scripts/seed-gmail-credential.mjs
 *
 * Copiar .env.example → .env.local y completar los valores antes de correr.
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const UID           = process.env.SEED_GMAIL_UID;
const ACCESS_TOKEN  = process.env.SEED_GMAIL_ACCESS_TOKEN;
const REFRESH_TOKEN = process.env.SEED_GMAIL_REFRESH_TOKEN;

if (!UID || !ACCESS_TOKEN || !REFRESH_TOKEN) {
  console.error('❌ Faltan variables de entorno: SEED_GMAIL_UID, SEED_GMAIL_ACCESS_TOKEN, SEED_GMAIL_REFRESH_TOKEN');
  process.exit(1);
}

const { initializeApp } = await import('firebase-admin/app');
const { getFirestore }  = await import('firebase-admin/firestore');

initializeApp({ projectId: 'ats-tema-ort' });
const db = getFirestore();

await db.collection('users').doc(UID).set(
  { gmailCredential: { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, expiresAt: Date.now() + 3_599_000 } },
  { merge: true }
);

console.log(`✅ gmailCredential inyectado para users/${UID}`);
