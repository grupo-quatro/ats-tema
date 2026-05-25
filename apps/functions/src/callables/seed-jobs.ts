import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import { SeedJobsService } from '../services/seed-jobs-service';

const seedJobsService = new SeedJobsService();

function isEmulatorEnvironment(): boolean {
  return (
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    typeof process.env.FIRESTORE_EMULATOR_HOST === 'string'
  );
}

export const seedJobs = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed.' });
    return;
  }

  if (!isEmulatorEnvironment()) {
    res.status(403).json({
      error:
        'La carga de semillas de puestos solo está habilitada en emuladores.',
    });
    return;
  }

  try {
    const result = await seedJobsService.seedJobs();
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error cargando semillas de puestos', error);
    res
      .status(500)
      .json({ error: 'No se pudieron cargar las semillas de puestos.' });
  }
});
