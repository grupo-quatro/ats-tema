import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { SeedCandidatesService } from '../services/seedCandidatesService';

const seedCandidatesService = new SeedCandidatesService();

function isEmulatorEnvironment(): boolean {
  return (
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    typeof process.env.FIRESTORE_EMULATOR_HOST === 'string'
  );
}

export const seedCandidates = onCall(async () => {
  if (!isEmulatorEnvironment()) {
    throw new HttpsError(
      'failed-precondition',
      'La carga de semillas de candidatos solo está habilitada en emuladores.',
    );
  }

  try {
    return await seedCandidatesService.seedCandidates();
  } catch (error) {
    logger.error('Error cargando semillas de candidatos', error);

    throw new HttpsError(
      'internal',
      'No se pudieron cargar las semillas de candidatos.',
    );
  }
});
