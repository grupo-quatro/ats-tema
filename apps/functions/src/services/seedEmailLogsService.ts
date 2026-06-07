import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import type { ApplicationStage, EmailLogStatus } from '@ats/shared-types';
import { PIPELINE_ORDER, STAGE_CONFIG } from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

const EMAIL_LOGS_COLLECTION = 'emailLogs';
const APPLICATIONS_COLLECTION = 'applications';

export type SeedEmailLogsResult = {
  processed: number;
  created: number;
  skipped: number;
};

export class SeedEmailLogsServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SeedEmailLogsServiceError';
  }
}

// Jump stages que no siguen el orden lineal del pipeline
const JUMP_STAGES: ApplicationStage[] = ['rejected', 'withdrawn'];

// Stages lineales sin profile_pending (no se expone al reclutador)
const LINEAR_PIPELINE: ApplicationStage[] = PIPELINE_ORDER.filter(
  (s) => s !== 'profile_pending',
);

// Stages con emailTemplateStage !== null — derivado de STAGE_CONFIG
const STAGES_WITH_EMAIL: ApplicationStage[] = (
  [...LINEAR_PIPELINE, ...JUMP_STAGES] as ApplicationStage[]
).filter((stage) => STAGE_CONFIG[stage].emailTemplateStage !== null);

/**
 * Dado el stage actual de una aplicación, devuelve la lista de stages
 * (en orden) que habrían ocurrido y que disparan un email.
 *
 * Para stages lineales: incluye todos los stages con email desde el
 * inicio del pipeline hasta el targetStage (inclusive).
 *
 * Para jump stages (rejected, withdrawn): solo el propio jump stage
 * si tiene emailTemplateStage, sin historial lineal previo para el log
 * (el historial completo ya está en stageHistory; aquí solo modelamos
 * los emails que habrían salido).
 */
function getEmailStagesUpTo(targetStage: ApplicationStage): ApplicationStage[] {
  if (JUMP_STAGES.includes(targetStage)) {
    if (STAGE_CONFIG[targetStage].emailTemplateStage !== null) {
      return [targetStage];
    }
    return [];
  }

  const targetIdx = LINEAR_PIPELINE.indexOf(targetStage);
  if (targetIdx === -1) {
    return [];
  }

  return STAGES_WITH_EMAIL.filter((stage) => {
    if (JUMP_STAGES.includes(stage)) return false;
    const stageIdx = LINEAR_PIPELINE.indexOf(stage);
    return stageIdx <= targetIdx;
  });
}

function resolveJobTitle(jobId: string): string {
  const JOB_TITLES: Record<string, string> = {
    'frontend-ssr-developer': 'Frontend SSR Developer',
    'backend-firebase-developer': 'Backend Firebase Developer',
    'technical-recruiter': 'Technical Recruiter',
    'qa-automation-analyst': 'QA Automation Analyst',
  };
  return JOB_TITLES[jobId] ?? jobId;
}

type TemplateInfo = {
  templateId: string;
  templateName: string;
  subject: string;
  body: string;
};

function getTemplateInfo(
  stage: ApplicationStage,
  candidateName: string,
  jobId: string,
): TemplateInfo {
  const jobTitle = resolveJobTitle(jobId);
  const stageLabel = STAGE_CONFIG[stage].label;
  const emailStage = STAGE_CONFIG[stage].emailTemplateStage;

  switch (emailStage) {
    case 'application_received':
      return {
        templateId: 'confirmacion-recepcion',
        templateName: 'Confirmación de Recepción',
        subject: `Hemos recibido tu postulación para ${jobTitle}`,
        body: `<p>Estimado/a ${candidateName},</p><p>Nos complace informarte que hemos recibido tu postulación para el puesto de <strong>${jobTitle}</strong> en <strong>Tema</strong>.</p><p>Nuestro equipo revisará tu perfil y nos pondremos en contacto contigo próximamente.</p><p>Saludos,<br>Recruiter Tema<br>recruiter@tema.dev</p>`,
      };
    case 'sch_interview_hr_1':
      return {
        templateId: 'agendar-entrevista-rrhh-r1',
        templateName: 'Agendar Entrevista RRHH R1',
        subject: `Invitación a agendar entrevista RRHH — ${jobTitle}`,
        body: `<p>Estimado/a ${candidateName},</p><p>Has avanzado en el proceso de selección para <strong>${jobTitle}</strong>.</p><p>Te invitamos a agendar tu entrevista con RRHH: <a href="https://calendar.google.com/calendar/appointments">Agendar entrevista</a></p><p>Saludos,<br>Recruiter Tema<br>recruiter@tema.dev</p>`,
      };
    case 'interview_hr_1':
      return {
        templateId: 'confirmacion-entrevista-rrhh-r1',
        templateName: 'Confirmación Entrevista RRHH R1',
        subject: `Confirmación de tu entrevista RRHH — ${jobTitle}`,
        body: `<p>Estimado/a ${candidateName},</p><p>Confirmamos tu entrevista con el equipo de RRHH para el puesto de <strong>${jobTitle}</strong>.</p><p>Recibirás los detalles de conexión próximamente.</p><p>Saludos,<br>Recruiter Tema<br>recruiter@tema.dev</p>`,
      };
    case 'sch_interview_hr_2':
      return {
        templateId: 'agendar-entrevista-rrhh-r2',
        templateName: 'Agendar Entrevista RRHH R2',
        subject: `Invitación a agendar segunda entrevista RRHH — ${jobTitle}`,
        body: `<p>Estimado/a ${candidateName},</p><p>Avanzas a la segunda ronda RRHH del proceso para <strong>${jobTitle}</strong>.</p><p>Te invitamos a agendar: <a href="https://calendar.google.com/calendar/appointments">Agendar entrevista</a></p><p>Saludos,<br>Recruiter Tema<br>recruiter@tema.dev</p>`,
      };
    case 'interview_hr_2':
      return {
        templateId: 'confirmacion-entrevista-rrhh-r2',
        templateName: 'Confirmación Entrevista RRHH R2',
        subject: `Confirmación de tu segunda entrevista RRHH — ${jobTitle}`,
        body: `<p>Estimado/a ${candidateName},</p><p>Confirmamos tu segunda entrevista con RRHH para el puesto de <strong>${jobTitle}</strong>.</p><p>Saludos,<br>Recruiter Tema<br>recruiter@tema.dev</p>`,
      };
    case 'sch_interview_tech_1':
      return {
        templateId: 'agendar-entrevista-tecnica-r1',
        templateName: 'Agendar Entrevista Técnica R1',
        subject: `Invitación a agendar entrevista técnica — ${jobTitle}`,
        body: `<p>Estimado/a ${candidateName},</p><p>Has avanzado a la instancia técnica del proceso para <strong>${jobTitle}</strong>.</p><p>Te invitamos a agendar tu entrevista técnica: <a href="https://calendar.google.com/calendar/appointments">Agendar entrevista técnica</a></p><p>Saludos,<br>Recruiter Tema<br>recruiter@tema.dev</p>`,
      };
    case 'interview_tech_1':
      return {
        templateId: 'confirmacion-entrevista-tecnica-r1',
        templateName: 'Confirmación Entrevista Técnica R1',
        subject: `Confirmación de tu entrevista técnica — ${jobTitle}`,
        body: `<p>Estimado/a ${candidateName},</p><p>Confirmamos tu entrevista técnica para el puesto de <strong>${jobTitle}</strong>.</p><p>Saludos,<br>Recruiter Tema<br>recruiter@tema.dev</p>`,
      };
    case 'sch_interview_tech_2':
      return {
        templateId: 'agendar-entrevista-tecnica-r2',
        templateName: 'Agendar Entrevista Técnica R2',
        subject: `Invitación a agendar segunda entrevista técnica — ${jobTitle}`,
        body: `<p>Estimado/a ${candidateName},</p><p>Avanzas a la segunda ronda técnica del proceso para <strong>${jobTitle}</strong>.</p><p>Te invitamos a agendar: <a href="https://calendar.google.com/calendar/appointments">Agendar entrevista técnica</a></p><p>Saludos,<br>Recruiter Tema<br>recruiter@tema.dev</p>`,
      };
    case 'interview_tech_2':
      return {
        templateId: 'confirmacion-entrevista-tecnica-r2',
        templateName: 'Confirmación Entrevista Técnica R2',
        subject: `Confirmación de tu segunda entrevista técnica — ${jobTitle}`,
        body: `<p>Estimado/a ${candidateName},</p><p>Confirmamos tu segunda entrevista técnica para el puesto de <strong>${jobTitle}</strong>.</p><p>Saludos,<br>Recruiter Tema<br>recruiter@tema.dev</p>`,
      };
    case 'offer':
      return {
        templateId: 'oferta-laboral',
        templateName: 'Oferta Laboral',
        subject: `Oferta laboral — ${jobTitle}`,
        body: `<p>Estimado/a ${candidateName},</p><p>Es un placer informarte que hemos decidido hacerte una oferta para el puesto de <strong>${jobTitle}</strong>.</p><p>Adjuntamos los detalles de la propuesta para tu revisión. Por favor, contáctanos para coordinar los próximos pasos.</p><p>Saludos,<br>Recruiter Tema<br>recruiter@tema.dev</p>`,
      };
    case 'hired':
      return {
        templateId: 'bienvenida',
        templateName: 'Bienvenida al equipo',
        subject: `Bienvenido/a al equipo — ${jobTitle}`,
        body: `<p>Estimado/a ${candidateName},</p><p>Nos complace confirmarte tu incorporación al equipo en el rol de <strong>${jobTitle}</strong>.</p><p>Próximamente recibirás información sobre tu onboarding.</p><p>¡Bienvenido/a!<br>Recruiter Tema<br>recruiter@tema.dev</p>`,
      };
    case 'rejected':
      return {
        templateId: 'rechazo-cordial',
        templateName: 'Rechazo Cordial',
        subject: `Actualización sobre tu postulación en Tema`,
        body: `<p>Estimado/a ${candidateName},</p><p>Agradecemos tu interés en formar parte de <strong>Tema</strong> y el tiempo dedicado a postularte para el puesto de <strong>${jobTitle}</strong>.</p><p>Luego de una cuidadosa evaluación, hemos decidido continuar el proceso con otros candidatos.</p><p>Te deseamos éxito en tu búsqueda laboral.<br>Recruiter Tema</p>`,
      };
    case 'withdrawn':
      return {
        templateId: 'cierre-proceso',
        templateName: 'Cierre de Proceso',
        subject: `Confirmación de retiro de postulación — ${jobTitle}`,
        body: `<p>Estimado/a ${candidateName},</p><p>Confirmamos que hemos procesado el retiro de tu postulación para el puesto de <strong>${jobTitle}</strong>.</p><p>Quedamos a tu disposición para futuros procesos.<br>Recruiter Tema<br>recruiter@tema.dev</p>`,
      };
    default:
      return {
        templateId: 'confirmacion-recepcion',
        templateName: 'Confirmación de Recepción',
        subject: `Actualización — ${stageLabel} — ${jobTitle}`,
        body: `<p>Estimado/a ${candidateName},</p><p>Te informamos sobre una actualización en tu postulación para <strong>${jobTitle}</strong>: ${stageLabel}.</p><p>Saludos,<br>Recruiter Tema<br>recruiter@tema.dev</p>`,
      };
  }
}

function resolveStatus(
  candidateIndex: number,
  logIndex: number,
  totalLogs: number,
): { status: EmailLogStatus; error?: string } {
  if (candidateIndex === 0) {
    // Primer candidato: todos sent
    return { status: 'sent' };
  }

  if (candidateIndex === 1) {
    // Segundo candidato: el último log en failed, los demás sent
    if (logIndex === totalLogs - 1) {
      return {
        status: 'failed',
        error: 'Credencial de Gmail no configurada.',
      };
    }
    return { status: 'sent' };
  }

  // Tercer candidato en adelante: mezclar
  const pattern = (candidateIndex + logIndex) % 3;
  if (pattern === 0) return { status: 'sent' };
  if (pattern === 1) return { status: 'pending' };
  return {
    status: 'failed',
    error: 'No se pudo refrescar el token de acceso de Gmail.',
  };
}

type FirestoreApplicationData = {
  candidateId: string;
  jobId: string;
  stage: ApplicationStage;
  candidateEmail?: string;
  candidateName?: string;
};

export class SeedEmailLogsService {
  private readonly logsCollection = db.collection(EMAIL_LOGS_COLLECTION);
  private readonly applicationsCollection = db.collection(
    APPLICATIONS_COLLECTION,
  );

  async seedEmailLogs(): Promise<SeedEmailLogsResult> {
    try {
      // 1. Idempotencia: si ya hay logs, salir
      const existingSnapshot = await this.logsCollection.limit(1).get();
      if (!existingSnapshot.empty) {
        return { processed: 0, created: 0, skipped: 0 };
      }

      // 2. Leer applications existentes (limit 20)
      const applicationsSnapshot = await this.applicationsCollection
        .limit(20)
        .get();

      if (applicationsSnapshot.empty) {
        return { processed: 0, created: 0, skipped: 0 };
      }

      const batch = db.batch();
      let created = 0;
      let candidateIndex = 0;

      for (const appDoc of applicationsSnapshot.docs) {
        const appData = appDoc.data() as FirestoreApplicationData;
        const applicationId = appDoc.id;

        const stagesToLog = getEmailStagesUpTo(appData.stage);
        if (stagesToLog.length === 0) {
          continue;
        }

        const candidateName = appData.candidateName ?? 'Candidato/a';
        const candidateEmail =
          appData.candidateEmail ?? 'candidato@example.com';

        for (let logIndex = 0; logIndex < stagesToLog.length; logIndex++) {
          const stage = stagesToLog[logIndex];
          const templateInfo = getTemplateInfo(
            stage,
            candidateName,
            appData.jobId,
          );
          const { status, error } = resolveStatus(
            candidateIndex,
            logIndex,
            stagesToLog.length,
          );

          const docRef = this.logsCollection.doc();

          const logEntry: Record<string, unknown> = {
            applicationId,
            candidateId: appData.candidateId,
            candidateEmail,
            jobId: appData.jobId,
            templateId: templateInfo.templateId,
            templateName: templateInfo.templateName,
            stage,
            subject: templateInfo.subject,
            body: templateInfo.body,
            status,
            recruiterId: 'recruiter-dev',
            recruiterEmail: 'recruiter@tema.dev',
            attemptedAt: FieldValue.serverTimestamp(),
          };

          if (error !== undefined) {
            logEntry['error'] = error;
          }

          if (status === 'sent') {
            logEntry['sentAt'] = FieldValue.serverTimestamp();
          }

          batch.set(docRef, logEntry);
          created += 1;
        }

        candidateIndex += 1;
      }

      await batch.commit();

      return {
        processed: applicationsSnapshot.size,
        created,
        skipped: 0,
      };
    } catch (error) {
      throw new SeedEmailLogsServiceError(
        'No se pudieron cargar las semillas de email logs.',
        error,
      );
    }
  }
}
