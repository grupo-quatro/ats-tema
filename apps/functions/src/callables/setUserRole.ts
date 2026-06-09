import { onRequest } from 'firebase-functions/v2/https';
import {
  EMPLOYEE_ROLES,
  type SetUserRoleRequest,
  type SetUserRoleResponse,
} from '@ats/shared-types';
import { auth } from '../core/firebaseAdmin';
import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';

export const setUserRole = onRequest(async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method Not Allowed.' });
    return;
  }

  try {
    const caller = await requireAuthenticatedUser(request);

    if (caller.role !== EMPLOYEE_ROLES.ADMIN) {
      response
        .status(403)
        .json({ error: 'Forbidden. Only admins can assign roles.' });
      return;
    }

    const { uid, role } = request.body as Partial<SetUserRoleRequest>;

    if (!uid || typeof uid !== 'string') {
      response.status(400).json({ error: 'uid is required.' });
      return;
    }

    const validRoles = Object.values(EMPLOYEE_ROLES);
    if (!role || !validRoles.includes(role)) {
      response
        .status(400)
        .json({ error: `role must be one of: ${validRoles.join(', ')}.` });
      return;
    }

    await auth.setCustomUserClaims(uid, { role });

    const result: SetUserRoleResponse = { success: true };
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }
    console.error('setUserRole error:', error);
    response.status(500).json({ error: 'Internal server error.' });
  }
});
