import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Booking, BookingStatus } from '../../domain/booking/booking.entity';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';

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
  ) {}

  async execute(dto: SaveBookingDto): Promise<Booking> {
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`Booking ${dto.id} not found`);
    }
    return this.repo.save({
      ...dto,
      checkInDate: dto.checkInDate ? new Date(dto.checkInDate) : null,
      contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : null,
      checkOutDate: dto.checkOutDate ? new Date(dto.checkOutDate) : null,
    });
  }
}
