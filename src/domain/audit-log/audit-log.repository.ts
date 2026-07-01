import { AuditLog } from './audit-log.entity';

export const AUDIT_LOG_REPOSITORY = 'AUDIT_LOG_REPOSITORY';

export interface IAuditLogRepository {
  findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  saveMany(logs: Partial<AuditLog>[]): Promise<void>;
}
