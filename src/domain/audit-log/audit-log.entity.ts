export class AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  clerkUserId: string | null;
  clerkUserName: string | null;
  createdAt: Date;
}
