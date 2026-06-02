import type { ApplicationStage } from './application';

export type EmailTemplateStage =
  | 'application_received'
  | 'screening'
  | 'interview_hr'
  | 'interview_technical'
  | 'interview_final'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export interface EmailTemplate {
  id: string;
  name: string;
  stage: EmailTemplateStage;
  subject: string; // soporta variables: {{candidateName}}, {{jobTitle}}
  body: string; // soporta variables: {{candidateName}}, {{jobTitle}}, {{companyName}}
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateEmailTemplateDTO = Omit<
  EmailTemplate,
  'id' | 'createdAt' | 'updatedAt'
>;
export type UpdateEmailTemplateDTO = Partial<
  Omit<EmailTemplate, 'id' | 'createdAt'>
>;

export const APPLICATION_TO_EMAIL_STAGE_MAP: Record<
  ApplicationStage,
  EmailTemplateStage | null
> = {
  applied: 'application_received',
  profile_pending: null,
  screening: 'screening',
  cv_submitted: null,
  interview_1_scheduled: 'interview_hr',
  interview_1_done: null,
  interview_2_scheduled: 'interview_technical',
  interview_2_done: null,
  offer_sent: 'offer',
  hired: 'hired',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
};

export const TEMPLATE_VARIABLES = {
  CANDIDATE_NAME: {
    label: '[Nombre del Candidato]',
    description: 'Nombre completo del candidato',
  },
  POSITION_NAME: {
    label: '[Nombre de la Posición]',
    description: 'Título del puesto',
  },
  RECRUITER_NAME: {
    label: '[Nombre del Reclutador]',
    description: 'Nombre del HR responsable',
  },
  RECRUITER_EMAIL: {
    label: '[Email del Reclutador]',
    description: 'Email del reclutador',
  },
  CALENDAR_LINK: {
    label: '[Link de Agenda]',
    description: 'URL para agendar entrevista',
  },
  COMPANY_NAME: {
    label: '[Nombre de la Empresa]',
    description: 'Nombre de la organización',
  },
} as const;

export type TemplateVariableKey = keyof typeof TEMPLATE_VARIABLES;
export type TemplateVariableLabel =
  (typeof TEMPLATE_VARIABLES)[TemplateVariableKey]['label'];
