import { db } from '../core/firebaseAdmin';

interface OrgConfig {
  companyName: string;
}

export interface IOrgConfigRepository {
  get(): Promise<OrgConfig>;
}

export class OrgConfigRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'OrgConfigRepositoryError';
  }
}

export class OrgConfigRepository implements IOrgConfigRepository {
  private readonly collection = db.collection('config');

  async get(): Promise<OrgConfig> {
    try {
      const snapshot = await this.collection.doc('org').get();

      if (!snapshot.exists) {
        return { companyName: '' };
      }

      const data = snapshot.data();
      return { companyName: data?.companyName ?? '' };
    } catch (error) {
      throw new OrgConfigRepositoryError(
        'No se pudo obtener la configuración de la organización.',
        error,
      );
    }
  }
}
