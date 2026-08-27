export type AuditAction = 'create' | 'update' | 'delete';

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
