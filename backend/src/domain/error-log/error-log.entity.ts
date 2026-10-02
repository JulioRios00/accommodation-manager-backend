export class ErrorLog {
  id: string;
  message: string;
  stack: string | null;
  severity: 'critical' | 'error' | 'warning' | 'info';
  context: string;
  userId: string | null;
  userName: string | null;
  statusCode: number | null;
  url: string | null;
  method: string | null;
  resolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  notes: string | null;
  count: number;
  lastOccurred: Date;
  createdAt: Date;
  updatedAt: Date;
}
