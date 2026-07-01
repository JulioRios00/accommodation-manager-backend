import { Inject, Injectable } from '@nestjs/common';
import { ITicketActivityLogRepository, TICKET_ACTIVITY_LOG_REPOSITORY } from '../../domain/ticket-activity-log/ticket-activity-log.repository';

export interface AddTicketActivityDto {
  ticketId: string;
  eventType: string;
  clerkUserId?: string | null;
  clerkUserName?: string | null;
  comment?: string | null;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}

@Injectable()
export class AddTicketActivityUseCase {
  constructor(@Inject(TICKET_ACTIVITY_LOG_REPOSITORY) private readonly repo: ITicketActivityLogRepository) {}
  async execute(dto: AddTicketActivityDto) { return this.repo.save(dto); }
}
