import { Inject, Injectable, Logger } from '@nestjs/common';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';

// A booking's end date runs through 12:00 noon on that day — the bed frees up at 12:00:01,
// so a same-day handoff (one resident's contract ending, the next one's starting) works cleanly.
function noonCutoff(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
}

@Injectable()
export class TransitionExpiredBookingsUseCase {
  private readonly logger = new Logger(TransitionExpiredBookingsUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
  ) {}

  async execute(): Promise<{ transitioned: number }> {
    const now = new Date();
    const activeBookings = await this.bookingRepo.findAll('active');

    let transitioned = 0;
    for (const booking of activeBookings) {
      const end = booking.contractEndDate ?? booking.checkOutDate;
      if (!end || now <= noonCutoff(end)) continue;

      await this.bookingRepo.save({ id: booking.id, status: 'completed' });
      transitioned++;

      const remaining = await this.bookingRepo.findByBedId(booking.bedId);
      const hasActive = remaining.some(b => b.status === 'active');
      if (!hasActive) {
        await this.bedRepo.save({ id: booking.bedId, status: 'vacant' });
      }
    }

    if (transitioned) this.logger.log(`[transition-expired-bookings] ${transitioned} booking(s) moved to completed`);
    return { transitioned };
  }
}
