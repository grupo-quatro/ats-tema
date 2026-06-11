import { logger } from 'firebase-functions';
import { beforeUserCreated } from 'firebase-functions/v2/identity';

const ALLOWED_DOMAIN = 'temaconsulting.com.ar';

// Bloquea el registro de cuentas cuyo email no pertenezca al dominio de la empresa.
// El emulador no dispara beforeUserCreated, por lo que no afecta el flujo de dev local.
export const onUserCreated = beforeUserCreated(
  { region: process.env.FUNCTIONS_REGION ?? 'us-central1' },
  (event) => {
    const email = event.data?.email;

    if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      logger.warn(`Registro bloqueado — dominio no autorizado: ${email ?? '(sin email)'}`);
      throw new Error(`Solo se permiten cuentas @${ALLOWED_DOMAIN}.`);
    }
  },
);
