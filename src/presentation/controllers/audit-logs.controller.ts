import { Controller, Get, Query } from '@nestjs/common';
import { GetAuditLogsUseCase } from '../../application/use-cases/get-audit-logs.use-case';
import { Roles } from '../decorators/roles.decorator';

@Controller('audit-logs')
@Roles('sysadmin', 'manager', 'administrator')
export class AuditLogsController {
  constructor(private readonly getAuditLogs: GetAuditLogsUseCase) {}

  @Get()
  async findAll(
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.getAuditLogs.execute({ userId, entityType, entityId, dateFrom, dateTo });
  }
}
