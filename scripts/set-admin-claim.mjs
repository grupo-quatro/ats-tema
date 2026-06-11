#!/usr/bin/env node
/**
 * Asigna el custom claim role: 'admin' a un usuario de Firebase Auth.
 * Uso: node scripts/set-admin-claim.mjs <email>
 * Requiere: GOOGLE_APPLICATION_CREDENTIALS=/ruta/serviceAccount.json
 */

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [,, email] = process.argv;

if (!email) {
  console.error('Uso: node scripts/set-admin-claim.mjs <email>');
  process.exit(1);
}

initializeApp();

const user = await getAuth().getUserByEmail(email);
await getAuth().setCustomUserClaims(user.uid, { role: 'admin' });
console.log(`✓ Admin claim seteado para ${email} (uid: ${user.uid})`);
