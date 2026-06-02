import type {
  CreateEmailTemplateDTO,
  EmailTemplate,
  EmailTemplateStage,
  UpdateEmailTemplateDTO,
} from '@ats/shared-types';

import { emailTemplateRepository } from '../../repositories';

export const EMAIL_TEMPLATE_VARIABLES = [
  '[Nombre del Candidato]',
  '[Nombre de la Posición]',
] as const;

export const EMAIL_TEMPLATE_STAGE_LABELS: Record<EmailTemplateStage, string> = {
  application_received: 'Recibido',
  screening: 'Screening',
  interview_hr: 'Entrevista RRHH',
  interview_technical: 'Entrevista Técnica',
  interview_final: 'Entrevista Final',
  offer: 'Oferta',
  hired: 'Contratado',
  rejected: 'Rechazado',
  withdrawn: 'Retirado',
};

export const EMAIL_TEMPLATE_STAGES: EmailTemplateStage[] = [
  'application_received',
  'screening',
  'interview_hr',
  'interview_technical',
  'interview_final',
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
    name: 'Invitación a Entrevista',
    stage: 'interview_hr',
    subject: 'Invitación a entrevista - [Nombre de la Posición]',
    body: 'Estimado/a [Nombre del Candidato], Nos complace invitarte a una entrevista para la posición de [Nombre de la Posición]. Por favor, confirma tu disponibilidad. Saludos cordiales, Equipo de Recursos Humanos',
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
