import { EmailTemplate, EmailTemplateKey } from './email-template.entity';

export const EMAIL_TEMPLATE_REPOSITORY = 'EMAIL_TEMPLATE_REPOSITORY';

export interface IEmailTemplateRepository {
  findByKey(key: EmailTemplateKey): Promise<EmailTemplate | null>;
  save(template: EmailTemplate): Promise<EmailTemplate>;
}
