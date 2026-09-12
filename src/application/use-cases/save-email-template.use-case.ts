import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EMAIL_TEMPLATE_REPOSITORY, IEmailTemplateRepository } from '../../domain/email-template/email-template.repository';
import { EMAIL_TEMPLATE_KEYS, EmailTemplate, EmailTemplateKey } from '../../domain/email-template/email-template.entity';
import { unsupportedVariables } from '../../domain/email-template/email-template-renderer';

export interface SaveEmailTemplateDto {
  key: string;
  subject: string;
  body: string;
}

@Injectable()
export class SaveEmailTemplateUseCase {
  constructor(@Inject(EMAIL_TEMPLATE_REPOSITORY) private readonly repo: IEmailTemplateRepository) {}

  async execute(dto: SaveEmailTemplateDto): Promise<EmailTemplate> {
    if (!EMAIL_TEMPLATE_KEYS.includes(dto.key as EmailTemplateKey)) {
      throw new BadRequestException(`Unknown email template "${dto.key}"`);
    }

    const badVars = new Set([...unsupportedVariables(dto.subject), ...unsupportedVariables(dto.body)]);
    if (badVars.size) {
      throw new BadRequestException(`Unsupported template variable(s): ${[...badVars].join(', ')}`);
    }

    const template = new EmailTemplate();
    template.key = dto.key as EmailTemplateKey;
    template.subject = dto.subject;
    template.body = dto.body;
    return this.repo.save(template);
  }
}
