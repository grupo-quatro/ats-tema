import type { CalendarWatch, GmailCredential } from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

const USERS_COLLECTION = 'users';

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
  saveCalendarWatch(uid: string, watch: CalendarWatch): Promise<void>;
  getCalendarWatchByChannelId(
    channelId: string,
  ): Promise<{ uid: string; watch: CalendarWatch } | null>;
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

  // ─── Gmail ───────────────────────────────────────────────────────────────────

  async getGmailCredential(uid: string): Promise<GmailCredential | null> {
    try {
      const snapshot = await this.collection.doc(uid).get();
      if (!snapshot.exists) return null;
      const data = snapshot.data();
      return (data?.gmailCredential as GmailCredential | undefined) ?? null;
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

  // ─── Calendar OAuth ───────────────────────────────────────────────────────────

  async getCalendarCredential(uid: string): Promise<GmailCredential | null> {
    try {
      const snapshot = await this.collection.doc(uid).get();
      if (!snapshot.exists) return null;
      const data = snapshot.data();
      return (data?.calendarCredential as GmailCredential | undefined) ?? null;
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
        .set({ calendarCredential: credential }, { merge: true });
    } catch (error) {
      throw new UserRepositoryError(
        `No se pudo actualizar la credencial de Calendar para el usuario ${uid}.`,
        error,
      );
    }
  }

  // ─── Calendar Watch (canal de notificaciones push) ────────────────────────────

  /**
   * Guarda o reemplaza el canal de notificaciones push registrado en Google
   * Calendar para este recruiter. Se llama desde registerCalendarWatch y
   * desde renewCalendarWatches.
   */
  async saveCalendarWatch(uid: string, watch: CalendarWatch): Promise<void> {
    try {
      await this.collection
        .doc(uid)
        .set({ calendarWatch: watch }, { merge: true });
    } catch (error) {
      throw new UserRepositoryError(
        `No se pudo guardar el calendarWatch para el usuario ${uid}.`,
        error,
      );
    }
  }

  /**
   * Busca en la colección users el documento cuyo calendarWatch.channelId
   * coincida con el recibido en el header X-Goog-Channel-ID del webhook.
   * Devuelve el uid del recruiter y el watch completo, o null si no existe.
   *
   * Nota: este query requiere un índice en Firestore sobre el campo
   * calendarWatch.channelId. Si el volumen de recruiters es bajo (< 500),
   * funciona correctamente sin índice compuesto.
   */
  async getCalendarWatchByChannelId(
    channelId: string,
  ): Promise<{ uid: string; watch: CalendarWatch } | null> {
    try {
      const snapshot = await this.collection
        .where('calendarWatch.channelId', '==', channelId)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      const data = doc.data();

      return {
        uid: doc.id,
        watch: data.calendarWatch as CalendarWatch,
      };
    } catch (error) {
      throw new UserRepositoryError(
        `No se pudo buscar el calendarWatch con channelId=${channelId}.`,
        error,
      );
    }
  }
}
