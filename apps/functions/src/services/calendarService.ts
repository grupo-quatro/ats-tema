import { logger } from 'firebase-functions';
import { google } from 'googleapis';

import { ApplicationsRepository } from '../repositories/applicationRepository';
import { CandidatesRepository } from '../repositories/candidateRepository';
import { EmployeesRepository } from '../repositories/employeeRepository';

export class CalendarServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CalendarServiceError';
  }
}

export class CalendarServiceMissingDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalendarServiceMissingDataError';
  }
}

export class CalendarService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository = new ApplicationsRepository(),
    private readonly candidatesRepository: CandidatesRepository = new CandidatesRepository(),
    private readonly employeesRepository: EmployeesRepository = new EmployeesRepository(),
  ) {}

  
  async processInterviewScheduled(applicationId: string): Promise<void> {
    logger.info(
      `[CalendarService] Procesando entrevista para applicationId=${applicationId}`,
    );

   
    const application =
      await this.applicationsRepository.findById(applicationId);
    if (!application) {
      throw new CalendarServiceMissingDataError(
        `Postulación no encontrada: ${applicationId}`,
      );
    }

    
    const candidate = await this.candidatesRepository.findById(
      application.candidateId,
    );
    if (!candidate) {
      throw new CalendarServiceMissingDataError(
        `Candidato no encontrado: ${application.candidateId}`,
      );
    }

    if (!candidate.email) {
      logger.warn(
        `[CalendarService] El candidato ${candidate.id} no tiene email. ` +
          `Se omite la creación del evento para applicationId=${applicationId}.`,
      );
      return;
    }

    
    const latestEntry =
      await this.applicationsRepository.getLatestStageHistoryEntry(
        applicationId,
      );

    if (!latestEntry) {
      throw new CalendarServiceMissingDataError(
        `No se encontró historial de etapa para la postulación ${applicationId}.`,
      );
    }

    
    const { changedBy, changedByEmail } = latestEntry;

    
    const recruiter = await this.employeesRepository.findById(changedBy);

    if (!recruiter) {
      throw new CalendarServiceMissingDataError(
        `Reclutador no encontrado en employees: ${changedBy}`,
      );
    }

    if (!recruiter.calendarLink) {
      logger.warn(
        `[CalendarService] El reclutador ${changedByEmail} no tiene calendarLink configurado. ` +
          `Se omite la creación del evento para applicationId=${applicationId}.`,
      );
      return;
    }

    
    await this.createCalendarEvent({
      recruiterEmail: changedByEmail,
      recruiterCalendarLink: recruiter.calendarLink,
      candidateEmail: candidate.email,
      candidateName: candidate.fullName ?? candidate.email,
      jobTitle: application.jobTitle ?? 'Posición',
    });

    logger.info(
      `[CalendarService] Evento creado correctamente para applicationId=${applicationId}. ` +
        `Reclutador: ${changedByEmail}`,
    );
  }

  /**
   * Construye el cliente de autenticación según el entorno:
   *
   * DEV  — si existe GOOGLE_CALENDAR_ACCESS_TOKEN en el .env, usa ese token
   *        directamente (obtenido del OAuth Playground con tu Gmail personal).
   *        No requiere Service Account ni Workspace.
   *
   * PROD — usa Service Account con Domain-Wide Delegation (Workspace).
   *        Requiere GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildAuth(recruiterEmail: string): any {
    const devAccessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN;

    if (devAccessToken) {
      logger.info('[CalendarService] Usando access token directo (modo dev/Gmail personal)');
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: devAccessToken });
      return oauth2Client;
    }

    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!serviceAccountEmail || !privateKey) {
      throw new CalendarServiceError(
        'Faltan credenciales: configurá GOOGLE_CALENDAR_ACCESS_TOKEN (dev) ' +
        'o GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (prod).',
      );
    }

    return new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
      subject: recruiterEmail,
    });
  }

  private async createCalendarEvent(params: {
    recruiterEmail: string;
    recruiterCalendarLink: string;
    candidateEmail: string;
    candidateName: string;
    jobTitle: string;
  }): Promise<void> {
    const { recruiterEmail, candidateEmail, candidateName, jobTitle } = params;

    const auth = this.buildAuth(recruiterEmail);
    const calendar = google.calendar({ version: 'v3', auth: auth as never });


    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 7);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hora

    try {
      await calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1, // necesario para generar Meet link automático
        requestBody: {
          summary: `Entrevista — ${candidateName} / ${jobTitle}`,
          description:
            `Entrevista de selección para la posición: ${jobTitle}.\n\n` +
            `Candidato: ${candidateName} (${candidateEmail})\n\n` +
            `El candidato seleccionará el horario definitivo desde el enlace de agenda del reclutador.`,
          attendees: [{ email: candidateEmail }],
          start: {
            dateTime: startTime.toISOString(),
            timeZone: 'America/Argentina/Buenos_Aires',
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: 'America/Argentina/Buenos_Aires',
          },
          conferenceData: {
            createRequest: {
              requestId: `interview-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        },
      });
    } catch (error) {
      throw new CalendarServiceError(
        `Error al crear el evento en Google Calendar para ${recruiterEmail}.`,
        error,
      );
    }
  }
}
