// Kept to 10 chars max — the DB column is varchar(10), and TypeORM's synchronize does a
// DROP+ADD (not a plain ALTER) when a NOT NULL varchar column's length changes, which fails
// outright on a non-empty table. Staying within the existing width avoids that entirely.
export type AuditAction = 'create' | 'update' | 'delete' | 'export' | 'email_sent' | 'email_fail';

export interface AuditFieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

export class AuditLog {
  id: string;
  userId: string;
  userRole: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes: AuditFieldChange[];
  createdAt: Date;
}
