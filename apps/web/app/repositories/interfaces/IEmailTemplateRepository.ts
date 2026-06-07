import type {
  CreateEmailTemplateDTO,
  EmailTemplate,
  UpdateEmailTemplateDTO,
} from '@ats/shared-types';

export interface IEmailTemplateRepository {
  list(): Promise<EmailTemplate[]>;
  getById(id: string): Promise<EmailTemplate | null>;
  create(dto: CreateEmailTemplateDTO): Promise<EmailTemplate>;
  update(id: string, dto: UpdateEmailTemplateDTO): Promise<EmailTemplate>;
  delete(id: string): Promise<void>;
}
