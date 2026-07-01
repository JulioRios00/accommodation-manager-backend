import { MaintenanceTicket } from './maintenance-ticket.entity';

export const MAINTENANCE_TICKET_REPOSITORY = 'MAINTENANCE_TICKET_REPOSITORY';

export interface TicketFilter {
  propertyId?: string;
  status?: string;
  urgency?: string;
}

export interface IMaintenanceTicketRepository {
  findAll(filter?: TicketFilter): Promise<MaintenanceTicket[]>;
  findById(id: string): Promise<MaintenanceTicket | null>;
  getNextOrderNumber(): Promise<string>;
  save(ticket: Partial<MaintenanceTicket>): Promise<MaintenanceTicket>;
  delete(id: string): Promise<void>;
}
