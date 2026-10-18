import { Inject, Injectable } from '@nestjs/common';
import { AuditLogFilter, AUDIT_LOG_REPOSITORY, IAuditLogRepository } from '../../domain/audit-log/audit-log.repository';
import { AuditLogContextService } from '../services/audit-log-context.service';

@Injectable()
export class GetAuditLogsUseCase {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY) private readonly repo: IAuditLogRepository,
    private readonly context: AuditLogContextService,
  ) {}

  async execute(filter?: AuditLogFilter) {
    // A log line naming only an entity type and a uuid can't be acted on, so each row is
    // returned with the record it describes resolved to something findable.
    return this.context.enrich(await this.repo.findAll(filter));
  }
}
