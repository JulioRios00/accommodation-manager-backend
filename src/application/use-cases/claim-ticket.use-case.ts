import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IMaintenanceTicketRepository, MAINTENANCE_TICKET_REPOSITORY } from '../../domain/maintenance-ticket/maintenance-ticket.repository';
import { ITicketActivityLogRepository, TICKET_ACTIVITY_LOG_REPOSITORY } from '../../domain/ticket-activity-log/ticket-activity-log.repository';
import { MaintenanceTicketOrmEntity } from '../../infrastructure/database/typeorm/entities/maintenance-ticket.orm-entity';

export interface ClaimTicketDto {
  ticketId: string;
  clerkUserId?: string | null;
  clerkUserName?: string | null;
}

@Injectable()
export class ClaimTicketUseCase {
  constructor(
    @Inject(MAINTENANCE_TICKET_REPOSITORY) private readonly repo: IMaintenanceTicketRepository,
    @Inject(TICKET_ACTIVITY_LOG_REPOSITORY) private readonly activityRepo: ITicketActivityLogRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(dto: ClaimTicketDto) {
    return this.dataSource.transaction(async (manager) => {
      const ticket = await manager.findOne(MaintenanceTicketOrmEntity, {
        where: { id: dto.ticketId, active: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!ticket) throw new NotFoundException(`Ticket ${dto.ticketId} not found`);
      if (ticket.status !== 'open') {
        throw new BadRequestException(`Ticket is already ${ticket.status} and cannot be claimed`);
      }

      ticket.status = 'in_progress';
      await manager.save(MaintenanceTicketOrmEntity, ticket);

      await this.activityRepo.save({
        ticketId: dto.ticketId,
        eventType: 'status_change',
        clerkUserId: dto.clerkUserId ?? null,
        clerkUserName: dto.clerkUserName ?? null,
        field: 'status',
        oldValue: 'open',
        newValue: 'in_progress',
      });

      return this.repo.findById(dto.ticketId);
    });
  }
}
