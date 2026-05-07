export type EmailTemplateStage =
  | "application_received"
  | "screening"
  | "interview_hr"
  | "interview_technical"
  | "interview_final"
  | "offer"
  | "hired"
  | "rejected"
  | "withdrawn";

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
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateEmailTemplateDTO = Partial<
  Omit<EmailTemplate, "id" | "createdAt">
>;
