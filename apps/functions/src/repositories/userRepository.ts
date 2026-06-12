import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { GmailCredential } from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

const USERS_COLLECTION = 'users';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer | null {
  const raw = process.env.OAUTH_ENCRYPTION_KEY;
  if (!raw) return null;
  const buf = Buffer.from(raw, 'hex');
  if (buf.length !== 32)
    throw new Error(
      'OAUTH_ENCRYPTION_KEY debe ser 32 bytes en hex (64 caracteres).',
    );
  return buf;
}

function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  if (!key) return ciphertext;

  // Si el valor no es base64 válido de longitud suficiente, es un token legacy plaintext
  const buf = Buffer.from(ciphertext, 'base64');
  if (buf.length <= IV_LENGTH + TAG_LENGTH) return ciphertext;

  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(encrypted) + decipher.final('utf8');
}

function encryptCredential(credential: GmailCredential): GmailCredential {
  return {
    accessToken: encrypt(credential.accessToken),
    refreshToken: encrypt(credential.refreshToken),
    expiresAt: credential.expiresAt,
  };
}

function decryptCredential(credential: GmailCredential): GmailCredential {
  return {
    accessToken: decrypt(credential.accessToken),
    refreshToken: decrypt(credential.refreshToken),
    expiresAt: credential.expiresAt,
  };
}

export interface IUserRepository {
  getGmailCredential(uid: string): Promise<GmailCredential | null>;
  updateGmailCredential(
    uid: string,
    credential: GmailCredential,
  ): Promise<void>;
  getCalendarCredential(uid: string): Promise<GmailCredential | null>;
  updateCalendarCredential(
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
      if (!snapshot.exists) return null;

      const raw = snapshot.data()?.gmailCredential as
        | GmailCredential
        | undefined;
      return raw ? decryptCredential(raw) : null;
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
        .set(
          { gmailCredential: encryptCredential(credential) },
          { merge: true },
        );
    } catch (error) {
      throw new UserRepositoryError(
        `No se pudo actualizar la credencial de Gmail para el usuario ${uid}.`,
        error,
      );
    }
  }

  async getCalendarCredential(uid: string): Promise<GmailCredential | null> {
    try {
      const snapshot = await this.collection.doc(uid).get();
      if (!snapshot.exists) return null;

      const raw = snapshot.data()?.calendarCredential as
        | GmailCredential
        | undefined;
      return raw ? decryptCredential(raw) : null;
    } catch (error) {
      throw new UserRepositoryError(
        `No se pudo obtener la credencial de Calendar para el usuario ${uid}.`,
        error,
      );
    }
  }

  async updateCalendarCredential(
    uid: string,
    credential: GmailCredential,
  ): Promise<void> {
    try {
      await this.collection
        .doc(uid)
        .set(
          { calendarCredential: encryptCredential(credential) },
          { merge: true },
        );
    } catch (error) {
      throw new UserRepositoryError(
        `No se pudo actualizar la credencial de Calendar para el usuario ${uid}.`,
        error,
      );
    }
  }
}
