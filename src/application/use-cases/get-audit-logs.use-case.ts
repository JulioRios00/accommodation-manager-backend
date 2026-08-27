import { Inject, Injectable } from '@nestjs/common';
import { AuditLogFilter, AUDIT_LOG_REPOSITORY, IAuditLogRepository } from '../../domain/audit-log/audit-log.repository';

@Injectable()
export class GetAuditLogsUseCase {
  constructor(@Inject(AUDIT_LOG_REPOSITORY) private readonly repo: IAuditLogRepository) {}

  async execute(filter?: AuditLogFilter) {
    return this.repo.findAll(filter);
  }
}
