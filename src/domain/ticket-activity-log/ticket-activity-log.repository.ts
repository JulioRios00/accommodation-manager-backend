import { TicketActivityLog } from './ticket-activity-log.entity';

export const TICKET_ACTIVITY_LOG_REPOSITORY = 'TICKET_ACTIVITY_LOG_REPOSITORY';

export interface ITicketActivityLogRepository {
  findByTicket(ticketId: string): Promise<TicketActivityLog[]>;
  save(log: Partial<TicketActivityLog>): Promise<TicketActivityLog>;
}
