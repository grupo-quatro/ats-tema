import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import type { CreateOfferDTO, Offer, UpdateOfferDTO } from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

const OFFERS_COLLECTION = 'offers';

type FirestoreOffer = Omit<
  Offer,
  | 'createdAt'
  | 'updatedAt'
  | 'tokenExpiresAt'
  | 'tokenUsedAt'
  | 'sentAt'
  | 'acceptedAt'
  | 'declinedAt'
> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tokenExpiresAt?: Timestamp;
  tokenUsedAt?: Timestamp;
  sentAt?: Timestamp;
  acceptedAt?: Timestamp;
  declinedAt?: Timestamp;
};

export class OfferRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'OfferRepositoryError';
  }
}

export class OfferRepository {
  private readonly collection = db.collection(OFFERS_COLLECTION);

  createId(): string {
    return this.collection.doc().id;
  }

  async create(offerId: string, data: CreateOfferDTO): Promise<Offer> {
    try {
      const now = FieldValue.serverTimestamp();
      const offerRef = this.collection.doc(offerId);

      await offerRef.create({
        id: offerId,
        ...this.clean(data),
        createdAt: now,
        updatedAt: now,
      });

      const created = await offerRef.get();
      return this.mapToOffer(created.data() as FirestoreOffer);
    } catch (error) {
      throw new OfferRepositoryError('No se pudo crear la oferta.', error);
    }
  }

  async findById(offerId: string): Promise<Offer | null> {
    try {
      const snapshot = await this.collection.doc(offerId).get();
      if (!snapshot.exists) return null;
      return this.mapToOffer(snapshot.data() as FirestoreOffer);
    } catch (error) {
      throw new OfferRepositoryError(
        `No se pudo obtener la oferta ${offerId}.`,
        error,
      );
    }
  }

  async findByTokenHash(tokenHash: string): Promise<Offer | null> {
    try {
      const snapshot = await this.collection
        .where('tokenHash', '==', tokenHash)
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      return this.mapToOffer(snapshot.docs[0]!.data() as FirestoreOffer);
    } catch (error) {
      throw new OfferRepositoryError(
        'No se pudo obtener la oferta por token.',
        error,
      );
    }
  }

  async findLatestByApplicationId(
    applicationId: string,
  ): Promise<Offer | null> {
    try {
      const snapshot = await this.collection
        .where('applicationId', '==', applicationId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) return null;
      return this.mapToOffer(snapshot.docs[0]!.data() as FirestoreOffer);
    } catch (error) {
      throw new OfferRepositoryError(
        `No se pudo obtener la oferta para applicationId=${applicationId}.`,
        error,
      );
    }
  }

  async update(offerId: string, data: UpdateOfferDTO): Promise<Offer> {
    try {
      const cleanData = this.clean(data);
      const offerRef = this.collection.doc(offerId);

      await offerRef.update({
        ...cleanData,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const updated = await offerRef.get();
      return this.mapToOffer(updated.data() as FirestoreOffer);
    } catch (error) {
      throw new OfferRepositoryError(
        `No se pudo actualizar la oferta ${offerId}.`,
        error,
      );
    }
  }

  async updateDraftDetails(
    offerId: string,
    data: Pick<
      UpdateOfferDTO,
      | 'compensation'
      | 'startDate'
      | 'modality'
      | 'benefits'
      | 'expirationDate'
      | 'observations'
      | 'documentStoragePath'
      | 'documentHash'
    >,
  ): Promise<Offer> {
    try {
      const offerRef = this.collection.doc(offerId);
      const optionalFields = [
        'compensation',
        'startDate',
        'modality',
        'benefits',
        'expirationDate',
        'observations',
      ] as const;
      const updates: Record<string, unknown> = {
        documentStoragePath: data.documentStoragePath,
        documentHash: data.documentHash,
        updatedAt: FieldValue.serverTimestamp(),
      };

      optionalFields.forEach((field) => {
        updates[field] = data[field] ?? FieldValue.delete();
      });

      await offerRef.update(updates);

      const updated = await offerRef.get();
      return this.mapToOffer(updated.data() as FirestoreOffer);
    } catch (error) {
      throw new OfferRepositoryError(
        `No se pudo actualizar el borrador ${offerId}.`,
        error,
      );
    }
  }

  private clean<T extends Record<string, unknown>>(data: T): T {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as T;
  }

  private optionalDate(value?: Timestamp): Date | undefined {
    return value ? value.toDate() : undefined;
  }

  private mapToOffer(offer: FirestoreOffer): Offer {
    return {
      ...offer,
      createdAt: offer.createdAt.toDate(),
      updatedAt: offer.updatedAt.toDate(),
      tokenExpiresAt: this.optionalDate(offer.tokenExpiresAt),
      tokenUsedAt: this.optionalDate(offer.tokenUsedAt),
      sentAt: this.optionalDate(offer.sentAt),
      acceptedAt: this.optionalDate(offer.acceptedAt),
      declinedAt: this.optionalDate(offer.declinedAt),
    };
  }
}
