import { logger } from 'firebase-functions';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

import type { ApplicationStage } from '@ats/shared-types';

import { CalendarService, CalendarServiceError, CalendarServiceMissingDataError } from '../services/calendarService';

const calendarService = new CalendarService();

/**
  Stages que disparan la creación de un evento en Google Calendar.
 */
const INTERVIEW_STAGES: ApplicationStage[] = [
  'interview_1_scheduled',
  'interview_2_scheduled',
];


export const onApplicationUpdated = onDocumentUpdated(
  'applications/{applicationId}',
  async (event) => {
    const applicationId = event.params.applicationId;

    if (!event.data) {
      logger.warn(
        `[onApplicationUpdated] Evento sin datos para applicationId=${applicationId}. Se omite.`,
      );
      return;
    }

    const before = event.data.before.data() as { stage: ApplicationStage };
    const after  = event.data.after.data()  as { stage: ApplicationStage };

    // Solo actúa cuando el stage realmente cambió a un stage de entrevista
    if (
      before.stage === after.stage ||
      !INTERVIEW_STAGES.includes(after.stage)
    ) {
      return;
    }

    logger.info(
      `[onApplicationUpdated] Stage cambió de "${before.stage}" a "${after.stage}" ` +
        `para applicationId=${applicationId}. Iniciando flujo de Calendar.`,
    );

    try {
      await calendarService.processInterviewScheduled(applicationId);
    } catch (error) {
      if (error instanceof CalendarServiceMissingDataError) {
        
        logger.error(
          `[onApplicationUpdated] Dato faltante para applicationId=${applicationId}: ${(error as Error).message}`,
        );
        return;
      }

      if (error instanceof CalendarServiceError) {
        
        logger.error(
          `[onApplicationUpdated] Error en Google Calendar para applicationId=${applicationId}: ${(error as Error).message}`,
          { cause: (error as CalendarServiceError).cause },
        );
        return;
      }

     
      logger.error(
        `[onApplicationUpdated] Error inesperado para applicationId=${applicationId}`,
        error,
      );
      throw error;
    }
  },
);
