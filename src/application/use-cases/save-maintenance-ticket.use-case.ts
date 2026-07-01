import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IMaintenanceTicketRepository, MAINTENANCE_TICKET_REPOSITORY } from '../../domain/maintenance-ticket/maintenance-ticket.repository';

export interface SaveMaintenanceTicketDto {
  id?: string;
  propertyId: string;
  serviceProviderId?: string | null;
  title: string;
  descriptionRequested?: string | null;
  additionalDetails?: string | null;
  descriptionDone?: string | null;
  materials?: string | null;
  priority?: number;
  urgency?: string;
  status?: string;
  clientName?: string | null;
  clientPhone?: string | null;
  approvedBy?: string | null;
  approvalDate?: string | null;
  chargedBy?: string | null;
  houseCompany?: string | null;
  maintenanceCost?: number | null;
  materialCost?: number | null;
  totalCost?: number | null;
  entryNoticeDate?: string | null;
  entryCheckIn?: string | null;
  entryCheckOut?: string | null;
  causedByResident?: boolean;
  tags?: string[];
  clerkUserId?: string | null;
  clerkUserName?: string | null;
}

@Injectable()
export class SaveMaintenanceTicketUseCase {
  constructor(@Inject(MAINTENANCE_TICKET_REPOSITORY) private readonly repo: IMaintenanceTicketRepository) {}

  async execute(dto: SaveMaintenanceTicketDto) {
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`Ticket ${dto.id} not found`);
      return this.repo.save(dto as any);
    }
    const orderNumber = await this.repo.getNextOrderNumber();
    return this.repo.save({ ...dto, orderNumber, status: dto.status ?? 'open', urgency: dto.urgency ?? 'Low', priority: dto.priority ?? 0 } as any);
  }
}
