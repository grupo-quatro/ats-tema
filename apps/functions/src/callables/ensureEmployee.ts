import { onRequest } from 'firebase-functions/v2/https';
import type {
  EnsureEmployeeRequest,
  EnsureEmployeeResponse,
} from '@ats/shared-types';
import { db } from '../core/firebaseAdmin';
import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';

export const ensureEmployee = onRequest(async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method Not Allowed.' });
    return;
  }

  try {
    const { uid } = await requireAuthenticatedUser(request);
    const { email, displayName, photoURL } =
      request.body as Partial<EnsureEmployeeRequest>;

    if (!email) {
      response.status(400).json({ error: 'email is required.' });
      return;
    }

    const ref = db.collection('employees').doc(uid);
    const snap = await ref.get();

    if (snap.exists) {
      const result: EnsureEmployeeResponse = { isNew: false };
      response.status(200).json(result);
      return;
    }

    await ref.set({
      id: uid,
      email,
      name: displayName ?? email,
      photoURL: photoURL ?? null,
      role: null,
      department: '',
      active: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result: EnsureEmployeeResponse = { isNew: true };
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }
    console.error('ensureEmployee error:', error);
    response.status(500).json({ error: 'Internal server error.' });
  }
});
