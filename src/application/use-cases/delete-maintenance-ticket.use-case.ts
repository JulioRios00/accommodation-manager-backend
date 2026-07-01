import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IMaintenanceTicketRepository, MAINTENANCE_TICKET_REPOSITORY } from '../../domain/maintenance-ticket/maintenance-ticket.repository';

@Injectable()
export class DeleteMaintenanceTicketUseCase {
  constructor(@Inject(MAINTENANCE_TICKET_REPOSITORY) private readonly repo: IMaintenanceTicketRepository) {}

  async execute(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Ticket ${id} not found`);
    await this.repo.delete(id);
  }
}
