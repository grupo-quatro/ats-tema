export type EmailTemplateStage =
  | 'application_received'
  | 'sch_interview_hr_1'
  | 'interview_hr_1'
  | 'sch_interview_hr_2'
  | 'interview_hr_2'
  | 'sch_interview_tech_1'
  | 'interview_tech_1'
  | 'sch_interview_tech_2'
  | 'interview_tech_2'
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
  OFFER_LINK: {
    label: '[Link de Carta Oferta]',
    description: 'URL pública para revisar y responder la carta oferta',
  },
} as const;

export type TemplateVariableKey = keyof typeof TEMPLATE_VARIABLES;
export type TemplateVariableLabel =
  (typeof TEMPLATE_VARIABLES)[TemplateVariableKey]['label'];
