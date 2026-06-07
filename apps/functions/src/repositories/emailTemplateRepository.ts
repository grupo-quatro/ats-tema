import { Timestamp } from 'firebase-admin/firestore';

import type { EmailTemplate, EmailTemplateStage } from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

const EMAIL_TEMPLATES_COLLECTION = 'emailTemplates';

type FirestoreEmailTemplate = Omit<EmailTemplate, 'createdAt' | 'updatedAt'> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export interface IEmailTemplateRepository {
  findByStage(stage: EmailTemplateStage): Promise<EmailTemplate | null>;
}

export class EmailTemplateRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'EmailTemplateRepositoryError';
  }
}

export class EmailTemplateRepository implements IEmailTemplateRepository {
  private readonly collection = db.collection(EMAIL_TEMPLATES_COLLECTION);

  async findByStage(stage: EmailTemplateStage): Promise<EmailTemplate | null> {
    try {
      const snapshot = await this.collection
        .where('stage', '==', stage)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return this.mapToEmailTemplate(
        snapshot.docs[0].data() as FirestoreEmailTemplate,
      );
    } catch (error) {
      throw new EmailTemplateRepositoryError(
        `No se pudo obtener el template de email para el stage ${stage}.`,
        error,
      );
    }
  }

  private mapToEmailTemplate(template: FirestoreEmailTemplate): EmailTemplate {
    return {
      ...template,
      createdAt: template.createdAt.toDate(),
      updatedAt: template.updatedAt.toDate(),
    };
  }
}
