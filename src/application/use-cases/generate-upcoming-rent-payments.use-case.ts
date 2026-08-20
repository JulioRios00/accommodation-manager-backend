import { Inject, Injectable, Logger } from '@nestjs/common';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';

function monthKeyOneMonthAhead(from: Date): string {
  const target = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class GenerateUpcomingRentPaymentsUseCase {
  private readonly logger = new Logger(GenerateUpcomingRentPaymentsUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly rentPaymentRepo: IRentPaymentRepository,
  ) {}

  async execute(): Promise<{ created: number }> {
    const targetMonth = monthKeyOneMonthAhead(new Date());
    const targetMonthStart = new Date(`${targetMonth}-01T00:00:00`);

    const [activeBookings, existing] = await Promise.all([
      this.bookingRepo.findAll('active'),
      this.rentPaymentRepo.findAll({ month: targetMonth }),
    ]);
    const existingBookingIds = new Set(existing.map(p => p.bookingId));

    let created = 0;
    for (const booking of activeBookings) {
      if (!booking.bed) continue;
      if (existingBookingIds.has(booking.id)) continue;
      // Don't pre-create a payment for a month after the contract has already ended.
      if (booking.contractEndDate && new Date(booking.contractEndDate) < targetMonthStart) continue;

      const dueDay = booking.checkInDate ? new Date(booking.checkInDate).getDate() : 1;

      await this.rentPaymentRepo.save({
        residentId: booking.residentId,
        bookingId: booking.id,
        propertyId: booking.bed.propertyId,
        month: targetMonth,
        paymentDueDay: dueDay,
        rentAmount: booking.rentAmount,
        amountPaid: 0,
        lateStatus: 'on_time',
        paymentStatus: 'unpaid',
        datePaid: null,
        notes: null,
      } as any);
      created++;
    }

    if (created) this.logger.log(`[generate-upcoming-rent-payments] created ${created} payable record(s) for ${targetMonth}`);
    return { created };
  }
}
