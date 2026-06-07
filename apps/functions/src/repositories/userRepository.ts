import type { GmailCredential } from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

const USERS_COLLECTION = 'users';

export interface IUserRepository {
  getGmailCredential(uid: string): Promise<GmailCredential | null>;
  updateGmailCredential(
    uid: string,
    credential: GmailCredential,
  ): Promise<void>;
}

export class UserRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'UserRepositoryError';
  }
}

export class UserRepository implements IUserRepository {
  private readonly collection = db.collection(USERS_COLLECTION);

  async getGmailCredential(uid: string): Promise<GmailCredential | null> {
    try {
      const snapshot = await this.collection.doc(uid).get();

      if (!snapshot.exists) {
        return null;
      }

      const data = snapshot.data();
      const credential = data?.gmailCredential as GmailCredential | undefined;

      return credential ?? null;
    } catch (error) {
      throw new UserRepositoryError(
        `No se pudo obtener la credencial de Gmail para el usuario ${uid}.`,
        error,
      );
    }
  }

  async updateGmailCredential(
    uid: string,
    credential: GmailCredential,
  ): Promise<void> {
    try {
      await this.collection
        .doc(uid)
        .set({ gmailCredential: credential }, { merge: true });
    } catch (error) {
      throw new UserRepositoryError(
        `No se pudo actualizar la credencial de Gmail para el usuario ${uid}.`,
        error,
      );
    }
  }
}
