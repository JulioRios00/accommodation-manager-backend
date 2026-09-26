import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY, INotificationRepository } from '../../domain/notification/notification.repository';

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly repo: INotificationRepository) {}

  async execute(id: string, residentId: string) {
    const notification = await this.repo.findById(id);
    if (!notification) throw new NotFoundException(`Notification ${id} not found`);
    // A resident can only mark their own notifications read, not guess another's id.
    if (notification.residentId !== residentId) throw new ForbiddenException();
    if (notification.readAt) return notification;
    return this.repo.save({ ...notification, readAt: new Date() });
  }
}
