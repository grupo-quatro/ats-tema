import { FieldValue } from 'firebase-admin/firestore';

import { db } from '../core/firebaseAdmin';

const EMAIL_TEMPLATES_COLLECTION = 'emailTemplates';

export type SeedEmailTemplatesResult = {
  processed: number;
  created: number;
  skipped: number;
};

export class SeedEmailTemplatesServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SeedEmailTemplatesServiceError';
  }
}

type TemplateDefinition = {
  id: string;
  name: string;
  stage: string;
  subject: string;
  body: string;
  isDefault: boolean;
};

const TEMPLATE_SEEDS: TemplateDefinition[] = [
  {
    id: 'confirmacion-recepcion',
    name: 'Confirmación de Recepción',
    stage: 'application_received',
    subject: 'Hemos recibido tu postulación para [Nombre de la Posición]',
    body: `<p>Estimado/a [Nombre del Candidato],</p>
<p>Nos complace informarte que hemos recibido tu postulación para el puesto de <strong>[Nombre de la Posición]</strong> en <strong>[Nombre de la Empresa]</strong>.</p>
<p>Nuestro equipo revisará tu perfil y nos pondremos en contacto contigo próximamente.</p>
<p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>`,
    isDefault: true,
  },
  {
    id: 'invitacion-entrevista-rrhh-1',
    name: 'Invitación 1ª Entrevista RRHH',
    stage: 'sch_interview_hr_1',
    subject:
      'Te invitamos a agendar tu 1ª entrevista con RRHH — [Nombre de la Posición]',
    body: `<p>Estimado/a [Nombre del Candidato],</p>
<p>Nos alegra informarte que has avanzado en el proceso de selección para el puesto de <strong>[Nombre de la Posición]</strong> en <strong>[Nombre de la Empresa]</strong>.</p>
<p>Te invitamos a agendar tu entrevista con nuestro equipo de RRHH:</p>
<p><a href="[Link de Agenda]" style="display:inline-block;background-color:#F4511E;color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">Reservar una cita</a></p>
<p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>`,
    isDefault: true,
  },
  {
    id: 'entrevista-rrhh-1-agendada',
    name: '1ª Entrevista RRHH Agendada',
    stage: 'interview_hr_1',
    subject:
      'Tu 1ª entrevista con RRHH está confirmada — [Nombre de la Posición]',
    body: `<p>Estimado/a [Nombre del Candidato],</p>
<p>¡Perfecto! Tu entrevista con el equipo de RRHH para el puesto de <strong>[Nombre de la Posición]</strong> ha quedado agendada.</p>
<p>Te esperamos en el horario que seleccionaste. Ante cualquier consulta, escribinos a [Email del Reclutador].</p>
<p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>`,
    isDefault: true,
  },
  {
    id: 'invitacion-entrevista-rrhh-2',
    name: 'Invitación 2ª Entrevista RRHH',
    stage: 'sch_interview_hr_2',
    subject:
      'Te invitamos a agendar tu 2ª entrevista con RRHH — [Nombre de la Posición]',
    body: `<p>Estimado/a [Nombre del Candidato],</p>
<p>Queremos avanzar con una segunda instancia de entrevista con nuestro equipo de RRHH para el puesto de <strong>[Nombre de la Posición]</strong>.</p>
<p><a href="[Link de Agenda]" style="display:inline-block;background-color:#F4511E;color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">Reservar una cita</a></p>
<p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>`,
    isDefault: true,
  },
  {
    id: 'entrevista-rrhh-2-agendada',
    name: '2ª Entrevista RRHH Agendada',
    stage: 'interview_hr_2',
    subject:
      'Tu 2ª entrevista con RRHH está confirmada — [Nombre de la Posición]',
    body: `<p>Estimado/a [Nombre del Candidato],</p>
<p>Tu segunda entrevista con el equipo de RRHH para el puesto de <strong>[Nombre de la Posición]</strong> ha quedado agendada.</p>
<p>Te esperamos. Ante cualquier consulta, escribinos a [Email del Reclutador].</p>
<p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>`,
    isDefault: true,
  },
  {
    id: 'invitacion-entrevista-tecnica-1',
    name: 'Invitación 1ª Entrevista Técnica',
    stage: 'sch_interview_tech_1',
    subject:
      'Te invitamos a agendar tu 1ª entrevista técnica — [Nombre de la Posición]',
    body: `<p>Estimado/a [Nombre del Candidato],</p>
<p>Has avanzado a la instancia de evaluación técnica para el puesto de <strong>[Nombre de la Posición]</strong> en <strong>[Nombre de la Empresa]</strong>.</p>
<p><a href="[Link de Agenda]" style="display:inline-block;background-color:#F4511E;color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">Reservar una cita</a></p>
<p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>`,
    isDefault: true,
  },
  {
    id: 'entrevista-tecnica-1-agendada',
    name: '1ª Entrevista Técnica Agendada',
    stage: 'interview_tech_1',
    subject:
      'Tu 1ª entrevista técnica está confirmada — [Nombre de la Posición]',
    body: `<p>Estimado/a [Nombre del Candidato],</p>
<p>¡Excelente! Tu primera entrevista técnica para el puesto de <strong>[Nombre de la Posición]</strong> ha quedado agendada.</p>
<p>Te esperamos. Ante cualquier consulta, escribinos a [Email del Reclutador].</p>
<p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>`,
    isDefault: true,
  },
  {
    id: 'invitacion-entrevista-tecnica-2',
    name: 'Invitación 2ª Entrevista Técnica',
    stage: 'sch_interview_tech_2',
    subject:
      'Te invitamos a agendar tu 2ª entrevista técnica — [Nombre de la Posición]',
    body: `<p>Estimado/a [Nombre del Candidato],</p>
<p>Queremos avanzar con una segunda instancia técnica para el puesto de <strong>[Nombre de la Posición]</strong>.</p>
<p><a href="[Link de Agenda]" style="display:inline-block;background-color:#F4511E;color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;">Reservar una cita</a></p>
<p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>`,
    isDefault: true,
  },
  {
    id: 'entrevista-tecnica-2-agendada',
    name: '2ª Entrevista Técnica Agendada',
    stage: 'interview_tech_2',
    subject:
      'Tu 2ª entrevista técnica está confirmada — [Nombre de la Posición]',
    body: `<p>Estimado/a [Nombre del Candidato],</p>
<p>Tu segunda entrevista técnica para el puesto de <strong>[Nombre de la Posición]</strong> ha quedado agendada.</p>
<p>Te esperamos. Ante cualquier consulta, escribinos a [Email del Reclutador].</p>
<p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>`,
    isDefault: true,
  },
  {
    id: 'oferta-laboral',
    name: 'Oferta Laboral',
    stage: 'offer',
    subject: 'Tenemos una oferta para vos — [Nombre de la Posición]',
    body: `<p>Estimado/a [Nombre del Candidato],</p>
<p>Es un placer informarte que, tras el proceso de selección, queremos extenderte una oferta para el puesto de <strong>[Nombre de la Posición]</strong> en <strong>[Nombre de la Empresa]</strong>.</p>
<p>Nos pondremos en contacto a la brevedad para compartirte los detalles.</p>
<p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>`,
    isDefault: true,
  },
  {
    id: 'bienvenida',
    name: 'Bienvenida al equipo',
    stage: 'hired',
    subject: '¡Bienvenido/a a [Nombre de la Empresa]!',
    body: `<p>Estimado/a [Nombre del Candidato],</p>
<p>Nos alegra darte la bienvenida al equipo de <strong>[Nombre de la Empresa]</strong>. Estamos muy contentos de que te sumes para el rol de <strong>[Nombre de la Posición]</strong>.</p>
<p>En los próximos días recibirás toda la información para tu incorporación.</p>
<p>¡Hasta pronto!<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>`,
    isDefault: true,
  },
  {
    id: 'rechazo-cordial',
    name: 'Rechazo Cordial',
    stage: 'rejected',
    subject: 'Actualización sobre tu postulación en [Nombre de la Empresa]',
    body: `<p>Estimado/a [Nombre del Candidato],</p>
<p>Agradecemos tu interés en formar parte de <strong>[Nombre de la Empresa]</strong> y el tiempo dedicado a postularte para el puesto de <strong>[Nombre de la Posición]</strong>.</p>
<p>Luego de una cuidadosa evaluación, hemos decidido continuar el proceso con otros candidatos.</p>
<p>Te deseamos éxito en tu búsqueda laboral.<br>[Nombre del Reclutador]</p>`,
    isDefault: true,
  },
  {
    id: 'cierre-proceso',
    name: 'Cierre de Proceso',
    stage: 'withdrawn',
    subject: 'Cierre de tu postulación — [Nombre de la Posición]',
    body: `<p>Estimado/a [Nombre del Candidato],</p>
<p>Registramos el cierre de tu postulación para el puesto de <strong>[Nombre de la Posición]</strong> en <strong>[Nombre de la Empresa]</strong>.</p>
<p>Quedamos a tu disposición para futuras oportunidades.</p>
<p>Saludos,<br>[Nombre del Reclutador]<br>[Email del Reclutador]</p>`,
    isDefault: true,
  },
];

export class SeedEmailTemplatesService {
  private readonly collection = db.collection(EMAIL_TEMPLATES_COLLECTION);

  async seedEmailTemplates(): Promise<SeedEmailTemplatesResult> {
    try {
      const snapshot = await this.collection.limit(1).get();

      if (!snapshot.empty) {
        return {
          processed: TEMPLATE_SEEDS.length,
          created: 0,
          skipped: TEMPLATE_SEEDS.length,
        };
      }

      const batch = db.batch();

      for (const template of TEMPLATE_SEEDS) {
        const docRef = this.collection.doc(template.id);
        batch.set(docRef, {
          ...template,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();

      return {
        processed: TEMPLATE_SEEDS.length,
        created: TEMPLATE_SEEDS.length,
        skipped: 0,
      };
    } catch (error) {
      throw new SeedEmailTemplatesServiceError(
        'No se pudieron cargar las semillas de email templates.',
        error,
      );
    }
  }
}
