import type {
  CreateEmailTemplateDTO,
  EmailTemplate,
  EmailTemplateStage,
  UpdateEmailTemplateDTO,
} from '@ats/shared-types';
import { TEMPLATE_VARIABLES } from '@ats/shared-types';

import { emailTemplateRepository } from '../../repositories';

export const EMAIL_TEMPLATE_VARIABLES = Object.values(TEMPLATE_VARIABLES).map(
  ({ label }) => label,
);

export const EMAIL_TEMPLATE_STAGE_LABELS: Record<EmailTemplateStage, string> = {
  application_received: 'Recibido',
  sch_interview_hr_1: 'Agendar Entrevista RRHH R1',
  interview_hr_1: 'Entrevista RRHH R1',
  sch_interview_hr_2: 'Agendar Entrevista RRHH R2',
  interview_hr_2: 'Entrevista RRHH R2',
  sch_interview_tech_1: 'Agendar Entrevista Técnica R1',
  interview_tech_1: 'Entrevista Técnica R1',
  sch_interview_tech_2: 'Agendar Entrevista Técnica R2',
  interview_tech_2: 'Entrevista Técnica R2',
  offer: 'Oferta',
  hired: 'Contratado',
  rejected: 'Rechazado',
  withdrawn: 'Retirado',
};

export const EMAIL_TEMPLATE_STAGES: EmailTemplateStage[] = [
  'application_received',
  'sch_interview_hr_1',
  'interview_hr_1',
  'sch_interview_hr_2',
  'interview_hr_2',
  'sch_interview_tech_1',
  'interview_tech_1',
  'sch_interview_tech_2',
  'interview_tech_2',
  'offer',
  'hired',
  'rejected',
  'withdrawn',
];

const DEFAULT_EMAIL_TEMPLATES: CreateEmailTemplateDTO[] = [
  {
    name: 'Confirmación de Recepción',
    stage: 'application_received',
    subject: 'Hemos recibido tu postulación - [Nombre de la Posición]',
    body: 'Hola [Nombre del Candidato], Gracias por postularte a la posición de [Nombre de la Posición]. Hemos recibido tu aplicación y la estamos revisando. Saludos, Equipo de Recursos Humanos',
    isDefault: true,
  },
  {
    name: 'Invitación a Entrevista RRHH R1',
    stage: 'interview_hr_1',
    subject: 'Invitación a entrevista - [Nombre de la Posición]',
    body: 'Estimado/a [Nombre del Candidato], Nos complace invitarte a una entrevista para la posición de [Nombre de la Posición]. Por favor, confirmá tu disponibilidad. Saludos cordiales, Equipo de Recursos Humanos',
    isDefault: true,
  },
  {
    name: 'Rechazo Cordial',
    stage: 'rejected',
    subject: 'Actualización sobre tu postulación - [Nombre de la Posición]',
    body: 'Estimado/a [Nombre del Candidato], Agradecemos tu interés en la posición de [Nombre de la Posición]. En esta ocasión hemos decidido continuar con otros candidatos. Te deseamos mucho éxito en tu búsqueda laboral. Saludos, Equipo de Recursos Humanos',
    isDefault: true,
  },
];

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  return emailTemplateRepository.list();
}

export async function getEmailTemplate(
  id: string,
): Promise<EmailTemplate | null> {
  return emailTemplateRepository.getById(id);
}

export async function createEmailTemplate(
  payload: CreateEmailTemplateDTO,
): Promise<EmailTemplate> {
  return emailTemplateRepository.create(payload);
}

export async function updateEmailTemplate(
  id: string,
  payload: UpdateEmailTemplateDTO,
): Promise<EmailTemplate> {
  return emailTemplateRepository.update(id, payload);
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  return emailTemplateRepository.delete(id);
}

export async function seedDefaultTemplates(): Promise<void> {
  const existing = await emailTemplateRepository.list();
  if (existing.length > 0) return;

  await Promise.all(
    DEFAULT_EMAIL_TEMPLATES.map((dto) => emailTemplateRepository.create(dto)),
  );
}
