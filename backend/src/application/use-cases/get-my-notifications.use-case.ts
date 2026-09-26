import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY, INotificationRepository } from '../../domain/notification/notification.repository';

@Injectable()
export class GetMyNotificationsUseCase {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly repo: INotificationRepository) {}

  execute(residentId: string) {
    return this.repo.findByResident(residentId);
  }
}
