import { Inject, Injectable } from '@nestjs/common';
import { IMaintenanceTicketRepository, MAINTENANCE_TICKET_REPOSITORY, TicketFilter } from '../../domain/maintenance-ticket/maintenance-ticket.repository';

@Injectable()
export class GetMaintenanceTicketsUseCase {
  constructor(@Inject(MAINTENANCE_TICKET_REPOSITORY) private readonly repo: IMaintenanceTicketRepository) {}
  async execute(filter?: TicketFilter) { return this.repo.findAll(filter); }
}
