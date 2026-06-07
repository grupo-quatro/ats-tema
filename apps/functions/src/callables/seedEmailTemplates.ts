import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import { SeedEmailTemplatesService } from '../services/seedEmailTemplatesService';

const seedEmailTemplatesService = new SeedEmailTemplatesService();

function isEmulatorEnvironment(): boolean {
  return (
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    typeof process.env.FIRESTORE_EMULATOR_HOST === 'string'
  );
}

export const seedEmailTemplates = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed.' });
    return;
  }

  if (!isEmulatorEnvironment()) {
    res.status(403).json({
      error:
        'La carga de semillas de email templates solo está habilitada en emuladores.',
    });
    return;
  }

  try {
    const result = await seedEmailTemplatesService.seedEmailTemplates();
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error cargando semillas de email templates', error);
    res.status(500).json({
      error: 'No se pudieron cargar las semillas de email templates.',
    });
  }
});
