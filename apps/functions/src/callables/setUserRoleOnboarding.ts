import { onRequest } from 'firebase-functions/v2/https';
import type {
  SetUserRoleOnboardingRequest,
  SetUserRoleOnboardingResponse,
} from '@ats/shared-types';
import { auth, db } from '../core/firebaseAdmin';
import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';

const SELF_ASSIGNABLE_ROLES: ReadonlySet<string> = new Set([
  'hr',
  'area_leader',
]);

export const setUserRoleOnboarding = onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method Not Allowed.' });
    return;
  }

  try {
    const { uid } = await requireAuthenticatedUser(request);

    const { role } = request.body as Partial<SetUserRoleOnboardingRequest>;

    if (!role || !SELF_ASSIGNABLE_ROLES.has(role)) {
      response.status(400).json({
        error: 'role debe ser "hr" o "area_leader".',
      });
      return;
    }

    const employeeRef = db.collection('employees').doc(uid);
    const snap = await employeeRef.get();

    if (snap.exists) {
      const data = snap.data() as { role?: string | null };
      if (data.role !== null && data.role !== undefined) {
        response.status(400).json({ error: 'El rol ya fue asignado.' });
        return;
      }
    }

    await auth.setCustomUserClaims(uid, { role });

    await employeeRef.set(
      {
        id: uid,
        role,
        active: true,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    const result: SetUserRoleOnboardingResponse = { success: true };
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }
    console.error('setUserRoleOnboarding error:', error);
    response.status(500).json({ error: 'Internal server error.' });
  }
});
