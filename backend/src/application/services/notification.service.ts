import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY, INotificationRepository } from '../../domain/notification/notification.repository';
import { NotificationType } from '../../domain/notification/notification.entity';

// The in-app/mobile-alert equivalent of EmailService — no push/websocket delivery exists in
// SAMS, so this just persists the alert; the resident portal fetches it on load (matches how
// the rest of this app has no live-update mechanism anywhere else).
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly repo: INotificationRepository) {}

  async send(residentId: string, type: NotificationType, title: string, message: string): Promise<void> {
    try {
      await this.repo.save({ residentId, type, title, message, readAt: null });
    } catch (err) {
      this.logger.error(`[notification] failed to create in-app alert for resident ${residentId}: ${(err as Error).message}`);
    }
  }
}
