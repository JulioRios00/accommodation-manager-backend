import { AuditLog } from './audit-log.entity';

export interface AuditLogFilter {
  userId?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface IAuditLogRepository {
  save(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
  findAll(filter?: AuditLogFilter): Promise<AuditLog[]>;
}

export const AUDIT_LOG_REPOSITORY = 'AUDIT_LOG_REPOSITORY';
