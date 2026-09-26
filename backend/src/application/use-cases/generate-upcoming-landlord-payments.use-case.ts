import { Inject, Injectable, Logger } from '@nestjs/common';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { ILandlordPaymentRepository, LANDLORD_PAYMENT_REPOSITORY } from '../../domain/landlord-payment/landlord-payment.repository';

function monthKeyOneMonthAhead(from: Date): { key: string; year: number; month: number } {
  const target = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  return { key: `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`, year: target.getFullYear(), month: target.getMonth() };
}

@Injectable()
export class GenerateUpcomingLandlordPaymentsUseCase {
  private readonly logger = new Logger(GenerateUpcomingLandlordPaymentsUseCase.name);

  constructor(
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(LANDLORD_PAYMENT_REPOSITORY) private readonly landlordPaymentRepo: ILandlordPaymentRepository,
  ) {}

  async execute(): Promise<{ created: number }> {
    const { key: targetMonth, year, month } = monthKeyOneMonthAhead(new Date());

    const [properties, activeBookings, existing] = await Promise.all([
      this.propertyRepo.findAll(),
      this.bookingRepo.findAll('active'),
      this.landlordPaymentRepo.findAll({ month: targetMonth }),
    ]);
    const existingPropertyIds = new Set(existing.map(p => p.propertyId));

    // Expected rent income per property = sum of its currently occupied beds' rent —
    // this is what the landlord is owed for the property that month.
    const rentByPropertyId = new Map<string, number>();
    for (const booking of activeBookings) {
      if (!booking.bed) continue;
      rentByPropertyId.set(booking.bed.propertyId, (rentByPropertyId.get(booking.bed.propertyId) ?? 0) + booking.rentAmount);
    }

    let created = 0;
    for (const property of properties) {
      if (!property.landlordId) continue;
      if (existingPropertyIds.has(property.id)) continue;
      const amountDue = rentByPropertyId.get(property.id) ?? 0;
      if (amountDue <= 0) continue;

      const dueDay = property.landlordPaymentDueDay ?? 1;
      const dateDue = new Date(year, month, dueDay);

      await this.landlordPaymentRepo.save({
        propertyId: property.id,
        landlordId: property.landlordId,
        month: targetMonth,
        amountDue,
        amountPaid: 0,
        dateDue,
        datePaid: null,
        beneficiaryName: null,
        iban: null,
        bic: null,
        paymentReference: null,
        paymentMethod: null,
        status: 'pending',
        notes: null,
      } as any);
      created++;
    }

    if (created) this.logger.log(`[generate-upcoming-landlord-payments] created ${created} payable record(s) for ${targetMonth}`);
    return { created };
  }
}
