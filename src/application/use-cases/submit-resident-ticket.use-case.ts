import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { SaveMaintenanceTicketUseCase } from './save-maintenance-ticket.use-case';
import { MaintenanceTicket } from '../../domain/maintenance-ticket/maintenance-ticket.entity';

export interface SubmitResidentTicketDto {
  clerkUserId: string;
  category: string;
  title: string;
  description?: string | null;
}

@Injectable()
export class SubmitResidentTicketUseCase {
  constructor(
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    private readonly saveTicket: SaveMaintenanceTicketUseCase,
  ) {}

  async execute(dto: SubmitResidentTicketDto): Promise<MaintenanceTicket> {
    const resident = await this.residentRepo.findByClerkUserId(dto.clerkUserId);
    if (!resident) throw new ForbiddenException('No resident profile linked to this account');

    const booking = await this.bookingRepo.findActiveByResidentId(resident.id);
    if (!booking) throw new NotFoundException('No active licence agreement found for this resident');

    const bed = await this.bedRepo.findById(booking.bedId);
    if (!bed) throw new NotFoundException('Bed associated with this booking was not found');

    return this.saveTicket.execute({
      propertyId: bed.propertyId,
      bedId: bed.id,
      residentId: resident.id,
      category: dto.category,
      title: dto.title,
      descriptionRequested: dto.description ?? null,
      status: 'open',
      urgency: 'Low',
      clerkUserId: dto.clerkUserId,
      clerkUserName: resident.fullName,
    });
  }
}
