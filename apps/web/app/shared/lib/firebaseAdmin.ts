import {
  getApps,
  initializeApp,
  applicationDefault,
  type App,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

  if (useEmulators) {
    return initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }

  // En producción: usa Application Default Credentials (ADC).
  // En GCP (Cloud Run, App Engine) se resuelven automáticamente sin key file.
  // En local sin emulador: requiere `gcloud auth application-default login`.
  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export const adminAuth = getAuth(getAdminApp());
