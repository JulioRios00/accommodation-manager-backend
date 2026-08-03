import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Booking, BookingStatus } from '../../domain/booking/booking.entity';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';

export interface SaveBookingDto {
  id?: string;
  bedId: string;
  residentId: string;
  checkInDate?: string | null;
  contractEndDate?: string | null;
  checkOutDate?: string | null;
  depositAmount?: number;
  rentAmount?: number;
  isHeadResident?: boolean;
  isTemporary?: boolean;
  status: BookingStatus;
  comments?: string | null;
}

@Injectable()
export class SaveBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly repo: IBookingRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
  ) {}

  async execute(dto: SaveBookingDto): Promise<Booking> {
    const bed = await this.bedRepo.findById(dto.bedId);
    if (!bed) throw new NotFoundException(`Bed ${dto.bedId} not found`);

    const resident = await this.residentRepo.findById(dto.residentId);
    if (!resident) throw new NotFoundException(`Resident ${dto.residentId} not found`);

    const startDate = dto.checkInDate ? new Date(dto.checkInDate) : null;
    const endDate = dto.contractEndDate
      ? new Date(dto.contractEndDate)
      : dto.checkOutDate
        ? new Date(dto.checkOutDate)
        : null;

    if (startDate && endDate && startDate >= endDate) {
      throw new BadRequestException('Licence start date must be before end date');
    }

    if (startDate && endDate) {
      const overlapping = await this.repo.findOverlappingActive(dto.bedId, startDate, endDate, dto.id);
      if (overlapping.length > 0) {
        throw new BadRequestException(
          `Bed is already allocated during the selected period (conflicts with booking ${overlapping[0].id})`,
        );
      }
    }

    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`Booking ${dto.id} not found`);
    }

    const booking = await this.repo.save({
      ...dto,
      checkInDate: dto.checkInDate ? new Date(dto.checkInDate) : null,
      contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : null,
      checkOutDate: dto.checkOutDate ? new Date(dto.checkOutDate) : null,
    });

    if (booking.status === 'active') {
      await this.bedRepo.save({ id: dto.bedId, status: 'allocated' });
    }

    return booking;
  }
}
