import { FieldValue } from 'firebase-admin/firestore';

import type { ApplicationStage } from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

const APPLICATIONS_COLLECTION = 'applications';
const EMAIL_OUTBOX_COLLECTION = 'emailOutbox';
const OFFERS_COLLECTION = 'offers';

export interface SendOfferWorkflowInput {
  offerId: string;
  applicationId: string;
  sentBy: string;
  sentByEmail: string;
  tokenHash: string;
  tokenExpiresAt: Date;
  email: {
    to: string;
    subject: string;
    html: string;
    text: string;
    metadata: Record<string, string>;
  };
}

export class OfferWorkflowRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'OfferWorkflowRepositoryError';
  }
}

export class OfferWorkflowRepository {
  async sendOffer(input: SendOfferWorkflowInput): Promise<void> {
    try {
      const batch = db.batch();
      const now = FieldValue.serverTimestamp();
      const stage: ApplicationStage = 'offer_sent';
      const applicationRef = db
        .collection(APPLICATIONS_COLLECTION)
        .doc(input.applicationId);
      const stageHistoryRef = applicationRef.collection('stageHistory').doc();
      const offerRef = db.collection(OFFERS_COLLECTION).doc(input.offerId);
      const emailRef = db.collection(EMAIL_OUTBOX_COLLECTION).doc();

      batch.update(applicationRef, {
        stage,
        status: 'active',
        updatedAt: now,
        stageUpdatedAt: now,
      });

      batch.set(stageHistoryRef, {
        id: stageHistoryRef.id,
        stage,
        changedBy: input.sentBy,
        changedByEmail: input.sentByEmail,
        changedAt: now,
      });

      batch.set(emailRef, {
        id: emailRef.id,
        ...input.email,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });

      batch.update(offerRef, {
        status: 'sent',
        sentBy: input.sentBy,
        sentAt: now,
        tokenHash: input.tokenHash,
        tokenExpiresAt: input.tokenExpiresAt,
        updatedAt: now,
      });

      await batch.commit();
    } catch (error) {
      throw new OfferWorkflowRepositoryError(
        'No se pudo enviar la carta oferta de forma consistente.',
        error,
      );
    }
  }
}
