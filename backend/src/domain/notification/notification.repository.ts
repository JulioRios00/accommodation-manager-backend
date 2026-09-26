import { Notification } from './notification.entity';

export const NOTIFICATION_REPOSITORY = 'NOTIFICATION_REPOSITORY';

export interface INotificationRepository {
  findByResident(residentId: string): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  save(notification: Partial<Notification>): Promise<Notification>;
}
