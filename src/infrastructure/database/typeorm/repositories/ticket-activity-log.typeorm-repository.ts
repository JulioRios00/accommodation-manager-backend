import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { TicketActivityLog } from '../../../../domain/ticket-activity-log/ticket-activity-log.entity';
import { ITicketActivityLogRepository } from '../../../../domain/ticket-activity-log/ticket-activity-log.repository';
import { TicketActivityLogOrmEntity } from '../entities/ticket-activity-log.orm-entity';

@Injectable()
export class TicketActivityLogTypeOrmRepository implements ITicketActivityLogRepository {
  constructor(@InjectRepository(TicketActivityLogOrmEntity) private readonly repo: Repository<TicketActivityLogOrmEntity>) {}

  async findByTicket(ticketId: string): Promise<TicketActivityLog[]> {
    return (await this.repo.find({ where: { ticketId }, order: { createdAt: 'ASC' } })).map(this.toDomain);
  }

  async save(log: Partial<TicketActivityLog>): Promise<TicketActivityLog> {
    const e = this.repo.create(log as DeepPartial<TicketActivityLogOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  private toDomain(e: TicketActivityLogOrmEntity): TicketActivityLog {
    const d = new TicketActivityLog();
    d.id = e.id; d.ticketId = e.ticketId; d.eventType = e.eventType;
    d.clerkUserId = e.clerkUserId ?? null; d.clerkUserName = e.clerkUserName ?? null;
    d.comment = e.comment ?? null; d.field = e.field ?? null;
    d.oldValue = e.oldValue ?? null; d.newValue = e.newValue ?? null; d.createdAt = e.createdAt;
    return d;
  }
}
