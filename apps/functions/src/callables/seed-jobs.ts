import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { SeedJobsService } from '../services/seed-jobs-service';

const seedJobsService = new SeedJobsService();

function isEmulatorEnvironment(): boolean {
  return (
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    typeof process.env.FIRESTORE_EMULATOR_HOST === 'string'
  );
}

export const seedJobs = onCall(async () => {
  if (!isEmulatorEnvironment()) {
    throw new HttpsError(
      'failed-precondition',
      'La carga de semillas de puestos solo está habilitada en emuladores.',
    );
  }

  try {
    return await seedJobsService.seedJobs();
  } catch (error) {
    logger.error('Error cargando semillas de puestos', error);

    throw new HttpsError(
      'internal',
      'No se pudieron cargar las semillas de puestos.',
    );
  }
});
