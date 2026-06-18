import { Inject, Injectable } from '@nestjs/common';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { Booking, BookingStatus } from '../../domain/booking/booking.entity';

@Injectable()
export class GetBookingsUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
  ) {}

  async execute(status?: BookingStatus): Promise<Booking[]> {
    return this.bookingRepo.findAll(status);
  }
}
