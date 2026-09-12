import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Notification } from '../../../../domain/notification/notification.entity';
import { INotificationRepository } from '../../../../domain/notification/notification.repository';
import { NotificationOrmEntity } from '../entities/notification.orm-entity';

@Injectable()
export class NotificationTypeOrmRepository implements INotificationRepository {
  constructor(@InjectRepository(NotificationOrmEntity) private readonly repo: Repository<NotificationOrmEntity>) {}

  async findByResident(residentId: string): Promise<Notification[]> {
    return (await this.repo.find({ where: { residentId }, order: { createdAt: 'DESC' } })).map(this.toDomain);
  }

  async findById(id: string): Promise<Notification | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.toDomain(e) : null;
  }

  async save(notification: Partial<Notification>): Promise<Notification> {
    const e = this.repo.create(notification as DeepPartial<NotificationOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  private toDomain(e: NotificationOrmEntity): Notification {
    const d = new Notification();
    d.id = e.id; d.residentId = e.residentId; d.type = e.type; d.title = e.title;
    d.message = e.message; d.readAt = e.readAt ?? null; d.createdAt = e.createdAt;
    return d;
  }
}
