import { initializeApp, getApps } from 'firebase/app';
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

const isNew = getApps().length === 0;
const app = isNew ? initializeApp(firebaseConfig) : getApps()[0]!;

export const functions = getFunctions(
  app,
  process.env.NEXT_PUBLIC_FUNCTIONS_REGION ?? 'us-central1',
);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
const functionsEmulatorPort =
  process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_PORT ?? '5001';

if (isNew && useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFunctionsEmulator(
    functions,
    '127.0.0.1',
    Number(functionsEmulatorPort),
  );
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

/** @deprecated Usar los módulos en shared/api/ con fetch hacia onRequest en lugar de onCall */
export function callFunction<TData, TResult>(name: string, data: TData) {
  return httpsCallable<TData, TResult>(functions, name)(data);
}

export { getFunctionUrl } from './functionsUrl';
