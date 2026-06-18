import { Inject, Injectable } from '@nestjs/common';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { Bed } from '../../domain/bed/bed.entity';

export interface BedWithBooking extends Bed {
  activeBooking?: any;
}

@Injectable()
export class GetBedsUseCase {
  constructor(
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
  ) {}

  async execute(propertyId?: string): Promise<BedWithBooking[]> {
    const beds = await this.bedRepo.findAll(propertyId);
    const activeBookings = await this.bookingRepo.findAll('active');
    const bookingByBed = new Map(activeBookings.map((b) => [b.bedId, b]));

    return beds.map((bed) => ({
      ...bed,
      activeBooking: bookingByBed.get(bed.id) ?? null,
    }));
  }
}
