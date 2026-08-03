import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IMaintenanceTicketRepository, MAINTENANCE_TICKET_REPOSITORY } from '../../domain/maintenance-ticket/maintenance-ticket.repository';
import { ITicketActivityLogRepository, TICKET_ACTIVITY_LOG_REPOSITORY } from '../../domain/ticket-activity-log/ticket-activity-log.repository';

export interface CloseTicketDto {
  ticketId: string;
  resolutionNotes?: string | null;
  clerkUserId?: string | null;
  clerkUserName?: string | null;
}

@Injectable()
export class CloseTicketUseCase {
  constructor(
    @Inject(MAINTENANCE_TICKET_REPOSITORY) private readonly repo: IMaintenanceTicketRepository,
    @Inject(TICKET_ACTIVITY_LOG_REPOSITORY) private readonly activityRepo: ITicketActivityLogRepository,
  ) {}

  async execute(dto: CloseTicketDto) {
    const ticket = await this.repo.findById(dto.ticketId);
    if (!ticket) throw new NotFoundException(`Ticket ${dto.ticketId} not found`);
    if (ticket.status === 'completed') {
      throw new BadRequestException('Ticket is already completed');
    }

    const oldStatus = ticket.status;
    await this.repo.save({
      id: dto.ticketId,
      status: 'completed',
      descriptionDone: dto.resolutionNotes ?? ticket.descriptionDone,
    } as any);

    await this.activityRepo.save({
      ticketId: dto.ticketId,
      eventType: 'status_change',
      clerkUserId: dto.clerkUserId ?? null,
      clerkUserName: dto.clerkUserName ?? null,
      comment: dto.resolutionNotes ?? null,
      field: 'status',
      oldValue: oldStatus,
      newValue: 'completed',
    });

    return this.repo.findById(dto.ticketId);
  }
}
