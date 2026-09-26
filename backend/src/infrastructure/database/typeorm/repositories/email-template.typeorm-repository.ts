import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate, EmailTemplateKey } from '../../../../domain/email-template/email-template.entity';
import { IEmailTemplateRepository } from '../../../../domain/email-template/email-template.repository';
import { EmailTemplateOrmEntity } from '../entities/email-template.orm-entity';

@Injectable()
export class EmailTemplateTypeOrmRepository implements IEmailTemplateRepository {
  constructor(@InjectRepository(EmailTemplateOrmEntity) private readonly repo: Repository<EmailTemplateOrmEntity>) {}

  async findByKey(key: EmailTemplateKey): Promise<EmailTemplate | null> {
    const e = await this.repo.findOne({ where: { key } });
    return e ? this.toDomain(e) : null;
  }

  async save(template: EmailTemplate): Promise<EmailTemplate> {
    const e = this.repo.create({ key: template.key, subject: template.subject, body: template.body });
    return this.toDomain(await this.repo.save(e));
  }

  private toDomain(e: EmailTemplateOrmEntity): EmailTemplate {
    const d = new EmailTemplate();
    d.key = e.key as EmailTemplateKey;
    d.subject = e.subject;
    d.body = e.body;
    d.updatedAt = e.updatedAt;
    return d;
  }
}
