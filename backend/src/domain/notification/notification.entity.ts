export type NotificationType = 'deposit_refund_completed';

export class Notification {
  id: string;
  residentId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
}
