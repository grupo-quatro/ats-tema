import type {
  CreateEmailTemplateDTO,
  EmailTemplate,
  EmailTemplateStage,
  UpdateEmailTemplateDTO,
} from '@ats/shared-types';

const STORAGE_KEY = 'ats-email-templates';

type StoredEmailTemplate = Omit<EmailTemplate, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

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

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'confirmation-received',
    name: 'Confirmación de Recepción',
    stage: 'application_received',
    subject: 'Hemos recibido tu postulación - [Nombre de la Posición]',
    body: 'Hola [Nombre del Candidato], Gracias por postularte a la posición de [Nombre de la Posición]. Hemos recibido tu aplicación y la estamos revisando. Saludos, Equipo de Recursos Humanos',
    isDefault: true,
    createdAt: new Date('2026-04-15T10:00:00.000Z'),
    updatedAt: new Date('2026-04-20T10:00:00.000Z'),
  },
  {
    id: 'interview-invitation',
    name: 'Invitación a Entrevista',
    stage: 'interview_hr',
    subject: 'Invitación a entrevista - [Nombre de la Posición]',
    body: 'Estimado/a [Nombre del Candidato], Nos complace invitarte a una entrevista para la posición de [Nombre de la Posición]. Por favor, confirma tu disponibilidad. Saludos cordiales, Equipo de Recursos Humanos',
    isDefault: true,
    createdAt: new Date('2026-04-10T10:00:00.000Z'),
    updatedAt: new Date('2026-04-18T10:00:00.000Z'),
  },
  {
    id: 'kind-rejection',
    name: 'Rechazo Cordial',
    stage: 'rejected',
    subject: 'Actualización sobre tu postulación - [Nombre de la Posición]',
    body: 'Estimado/a [Nombre del Candidato], Agradecemos tu interés en la posición de [Nombre de la Posición]. En esta ocasión hemos decidido continuar con otros candidatos. Te deseamos mucho éxito en tu búsqueda laboral. Saludos, Equipo de Recursos Humanos',
    isDefault: true,
    createdAt: new Date('2026-04-05T10:00:00.000Z'),
    updatedAt: new Date('2026-04-15T10:00:00.000Z'),
  },
];

function hasStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function toStored(template: EmailTemplate): StoredEmailTemplate {
  return {
    ...template,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

function fromStored(template: StoredEmailTemplate): EmailTemplate {
  return {
    ...template,
    createdAt: new Date(template.createdAt),
    updatedAt: new Date(template.updatedAt),
  };
}

function readTemplates(): EmailTemplate[] {
  if (!hasStorage()) return DEFAULT_EMAIL_TEMPLATES;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(DEFAULT_EMAIL_TEMPLATES.map(toStored)),
    );
    return DEFAULT_EMAIL_TEMPLATES;
  }

  try {
    return (JSON.parse(stored) as StoredEmailTemplate[]).map(fromStored);
  } catch {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(DEFAULT_EMAIL_TEMPLATES.map(toStored)),
    );
    return DEFAULT_EMAIL_TEMPLATES;
  }
}

function writeTemplates(templates: EmailTemplate[]): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(templates.map(toStored)),
  );
}

function createId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${slug || 'plantilla'}-${Date.now()}`;
}

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  return readTemplates().sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
}

export async function getEmailTemplate(
  id: string,
): Promise<EmailTemplate | null> {
  return readTemplates().find((template) => template.id === id) ?? null;
}

export async function createEmailTemplate(
  payload: CreateEmailTemplateDTO,
): Promise<EmailTemplate> {
  const now = new Date();
  const template: EmailTemplate = {
    ...payload,
    id: createId(payload.name),
    createdAt: now,
    updatedAt: now,
  };

  writeTemplates([template, ...readTemplates()]);
  return template;
}

export async function updateEmailTemplate(
  id: string,
  payload: UpdateEmailTemplateDTO,
): Promise<EmailTemplate> {
  const templates = readTemplates();
  const existing = templates.find((template) => template.id === id);

  if (!existing) {
    throw new Error('No se encontró la plantilla.');
  }

  const updated: EmailTemplate = {
    ...existing,
    ...payload,
    id,
    updatedAt: new Date(),
  };

  writeTemplates(
    templates.map((template) => (template.id === id ? updated : template)),
  );
  return updated;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  writeTemplates(readTemplates().filter((template) => template.id !== id));
}
