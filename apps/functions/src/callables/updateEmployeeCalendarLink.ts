import { onRequest } from 'firebase-functions/v2/https';
import type {
  UpdateCalendarLinkRequest,
  UpdateCalendarLinkResponse,
} from '@ats/shared-types';
import { db } from '../core/firebaseAdmin';
import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import { setCorsHeaders } from '../core/cors';

export const updateEmployeeCalendarLink = onRequest(
  async (request, response) => {
    setCorsHeaders(response);

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

      const { calendarLink } =
        request.body as Partial<UpdateCalendarLinkRequest>;

      if (calendarLink === undefined || typeof calendarLink !== 'string') {
        response
          .status(400)
          .json({ error: 'calendarLink debe ser un string.' });
        return;
      }

      if (calendarLink !== '' && !calendarLink.startsWith('https://')) {
        response.status(400).json({
          error:
            'calendarLink debe ser una URL válida que comience con https://.',
        });
        return;
      }

      await db.collection('employees').doc(uid).update({
        calendarLink,
        updatedAt: new Date(),
      });

      const result: UpdateCalendarLinkResponse = { success: true };
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof HttpAuthError) {
        response.status(401).json({ error: error.message });
        return;
      }
      console.error('updateEmployeeCalendarLink error:', error);
      response.status(500).json({ error: 'Internal server error.' });
    }
  },
);
