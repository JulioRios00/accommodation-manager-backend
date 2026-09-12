import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { GetEmailTemplateUseCase } from '../../application/use-cases/get-email-template.use-case';
import { SaveEmailTemplateUseCase } from '../../application/use-cases/save-email-template.use-case';
import { Roles } from '../decorators/roles.decorator';
import { RequireFeatureFlag } from '../decorators/require-feature-flag.decorator';

@Controller('email-templates')
@Roles('sysadmin', 'manager')
@RequireFeatureFlag('overdue_escalation')
export class EmailTemplatesController {
  constructor(
    private readonly getTemplate: GetEmailTemplateUseCase,
    private readonly saveTemplate: SaveEmailTemplateUseCase,
  ) {}

  @Get(':key')
  async findOne(@Param('key') key: string) {
    return this.getTemplate.execute(key);
  }

  @Put(':key')
  async update(@Param('key') key: string, @Body() body: { subject: string; body: string }) {
    return this.saveTemplate.execute({ key, subject: body.subject, body: body.body });
  }
}
