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

    // Occupancy is derived from the live bookings, but 'inactive' is a decision someone
    // made about the bed itself — it outranks the derivation, or a deactivated bed would
    // read as lettable again on the very next page load.
    return beds.map((bed) => ({
      ...bed,
      status:
        bed.status === 'inactive'
          ? 'inactive'
          : bookingByBed.has(bed.id)
            ? 'allocated'
            : 'vacant',
      activeBooking: bookingByBed.get(bed.id) ?? null,
    }));
  }
}
