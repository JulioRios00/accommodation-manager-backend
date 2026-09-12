import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EMAIL_TEMPLATE_REPOSITORY, IEmailTemplateRepository } from '../../domain/email-template/email-template.repository';
import { EMAIL_TEMPLATE_KEYS, EmailTemplateKey, defaultEmailTemplate } from '../../domain/email-template/email-template.entity';

@Injectable()
export class GetEmailTemplateUseCase {
  constructor(@Inject(EMAIL_TEMPLATE_REPOSITORY) private readonly repo: IEmailTemplateRepository) {}

  async execute(key: string) {
    if (!EMAIL_TEMPLATE_KEYS.includes(key as EmailTemplateKey)) {
      throw new BadRequestException(`Unknown email template "${key}"`);
    }
    const existing = await this.repo.findByKey(key as EmailTemplateKey);
    return existing ?? defaultEmailTemplate(key as EmailTemplateKey);
  }
}
