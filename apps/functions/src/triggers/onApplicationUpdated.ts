import { logger } from 'firebase-functions';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

import type { ApplicationStage } from '@ats/shared-types';

/**
 * Trigger Firestore — se ejecuta cada vez que se actualiza un documento
 * en la colección `applications`.
 *
 * Responsabilidades actuales:
 *  - Loguear cambios de stage para auditoría (útil en Cloud Logging).
 *
 * Punto de extensión para efectos secundarios futuros que no deben acoplarse
 * al callable (p. ej. sincronización con sistemas externos, métricas, etc.).
 */
export const onApplicationUpdated = onDocumentUpdated(
  'applications/{applicationId}',
  async (event) => {
    const applicationId = event.params.applicationId;

    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) {
      logger.warn(
        `[onApplicationUpdated] Evento sin datos para applicationId=${applicationId}`,
      );
      return;
    }

    const stageBefore = before.stage as ApplicationStage | undefined;
    const stageAfter = after.stage as ApplicationStage | undefined;

    // Solo loguear cuando el stage cambia efectivamente
    if (stageBefore !== stageAfter) {
      logger.info('[onApplicationUpdated] Stage actualizado', {
        applicationId,
        from: stageBefore,
        to: stageAfter,
        calendarEventId: after.calendarEventId ?? null,
      });
    }
  },
);
