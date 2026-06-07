import { onRequest } from 'firebase-functions/v2/https';
import { db } from '../core/firebaseAdmin';

export const seedGmailCredential = onRequest(async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const { uid, accessToken, refreshToken, expiresAt } = request.body;
  if (!uid || !accessToken || !refreshToken) {
    response
      .status(400)
      .json({ error: 'uid, accessToken y refreshToken son requeridos' });
    return;
  }
  await db
    .collection('users')
    .doc(uid)
    .set(
      {
        gmailCredential: {
          accessToken,
          refreshToken,
          expiresAt: expiresAt ?? Date.now() + 3_599_000,
        },
      },
      { merge: true },
    );
  response.status(200).json({ ok: true, uid });
});
