import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditAction, AuditFieldChange } from '../../domain/audit-log/audit-log.entity';
import { AUDIT_LOG_REPOSITORY, IAuditLogRepository } from '../../domain/audit-log/audit-log.repository';

export interface Actor {
  userId: string;
  role?: string | null;
}

// Fields every entity carries that aren't meaningful in a diff (or are noisy to repeat every time).
const IGNORED_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'active']);

function diffFields(before: Record<string, unknown> | null, after: Record<string, unknown> | null): AuditFieldChange[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changes: AuditFieldChange[] = [];
  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue;
    const beforeVal = before ? before[key] : undefined;
    const afterVal = after ? after[key] : undefined;
    if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) continue;
    changes.push({ field: key, before: beforeVal ?? null, after: afterVal ?? null });
  }
  return changes;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(@Inject(AUDIT_LOG_REPOSITORY) private readonly repo: IAuditLogRepository) {}

  /** Records an audit entry. Never throws — a logging failure must not break the actual operation. */
  async record(params: {
    actor?: Actor;
    action: AuditAction;
    entityType: string;
    entityId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      const changes =
        params.action === 'create'
          ? diffFields(null, params.after ?? null)
          : params.action === 'delete'
            ? diffFields(params.before ?? null, null)
            : diffFields(params.before ?? null, params.after ?? null);

      // Nothing actually changed (e.g. a save with no field differences) — skip the noise.
      if (params.action === 'update' && changes.length === 0) return;

      await this.repo.save({
        userId: params.actor?.userId ?? 'unknown',
        userRole: params.actor?.role ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes,
      });
    } catch (err) {
      this.logger.warn(`[audit-log] failed to record ${params.action} on ${params.entityType} ${params.entityId}: ${(err as Error).message}`);
    }
  }
}
