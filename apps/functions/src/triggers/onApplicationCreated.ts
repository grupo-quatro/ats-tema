// branch: fb-50-57
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

import {
  SkillMatchService,
  SkillMatchServiceError,
} from '../services/skillMatchService';

const skillMatchService = new SkillMatchService();

/**
 * Trigger Firestore (Background Trigger) — se ejecuta automáticamente
 * cada vez que se crea un nuevo documento en la colección `applications`.
 *
 * Responsabilidad:
 *  - Delega el cálculo de match al SkillMatchService.
 *  - Maneja errores de forma explícita para evitar ejecuciones fantasma
 *    (la función no lanza en fallos esperados para no reintentar infinitamente).
 */
export const onApplicationCreated = onDocumentCreated(
  'applications/{applicationId}',
  async (event) => {
    const applicationId = event.params.applicationId;

    // Guardia temprana: si el snapshot no trae datos, no hay nada que procesar
    if (!event.data?.exists) {
      logger.warn(
        `[onApplicationCreated] Evento recibido sin datos para applicationId=${applicationId}. Se omite.`,
      );
      return;
    }

    logger.info(
      `[onApplicationCreated] Procesando match de skills para applicationId=${applicationId}`,
    );

    try {
      await skillMatchService.calculateAndPersist(applicationId);

      logger.info(
        `[onApplicationCreated] Match calculado correctamente para applicationId=${applicationId}`,
      );
    } catch (error) {
      if (error instanceof SkillMatchServiceError) {
        // Error de negocio esperado: logueamos pero no re-lanzamos
        // para evitar reintentos infinitos de Cloud Functions.
        logger.error(
          `[onApplicationCreated] Error de negocio al calcular match para applicationId=${applicationId}: ${error.message}`,
          { cause: error.cause },
        );
        return;
      }

      // Error inesperado: lo re-lanzamos para que Cloud Functions
      // registre el fallo y lo marque como error en la consola.
      logger.error(
        `[onApplicationCreated] Error inesperado para applicationId=${applicationId}`,
        error,
      );
      throw error;
    }
  },
);
