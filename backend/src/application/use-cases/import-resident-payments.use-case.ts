import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseResidentPayments } from '../../infrastructure/parsers/resident-payments.parser';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { ImportSkipReason } from './import-deposits.use-case';

@Injectable()
export class ImportResidentPaymentsUseCase {
  private readonly logger = new Logger(ImportResidentPaymentsUseCase.name);

  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly paymentRepo: IRentPaymentRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
  ) {}

  async execute(buffer: Buffer): Promise<{ imported: number; skipped: number; skipReasons: ImportSkipReason[] }> {
    const rows = parseResidentPayments(buffer);
    const properties = await this.propertyRepo.findAll();
    const byCode = new Map(properties.map(p => [p.code.toLowerCase(), p]));
    const residents = await this.residentRepo.findAll();
    const byName = new Map(residents.map(r => [r.fullName.toLowerCase().trim(), r]));
    const allBookings = await this.bookingRepo.findAll('active');

    // Existing payments for duplicate detection
    const existing = await this.paymentRepo.findAll();
    const existingKeys = new Set(existing.map(p => `${p.propertyId}|${p.residentId}|${p.month}`));

    let imported = 0;
    let skipped = 0;
    const skipReasons: ImportSkipReason[] = [];
    const skip = (identifier: string, reason: string) => {
      skipped++;
      skipReasons.push({ identifier, reason });
      this.logger.warn(`[import-resident-payments] skip ${identifier}: ${reason}`);
    };

    for (const row of rows) {
      const identifier = `${row.propertyCode} / ${row.residentName} / ${row.month}`;
      const property = byCode.get(row.propertyCode.toLowerCase());
      if (!property) { skip(identifier, `Property "${row.propertyCode}" not found`); continue; }

      const residentNameNorm = row.residentName.toLowerCase().trim();
      const resident = byName.get(residentNameNorm)
        ?? residents.find(r => r.fullName.toLowerCase().trim().startsWith(residentNameNorm.substring(0, 8)));

      if (!resident) { skip(identifier, `Resident "${row.residentName}" not found`); continue; }

      const key = `${property.id}|${resident.id}|${row.month}`;
      if (existingKeys.has(key)) { skip(identifier, 'Duplicate payment (already imported)'); continue; }

      // Column C (TenantPaymentDay) is also the resident's own Payment Due Day, shown on
      // their profile — not just a per-month snapshot on the generated payment record.
      if (row.paymentDueDay != null && resident.paymentDueDay !== row.paymentDueDay) {
        await this.residentRepo.save({ id: resident.id, paymentDueDay: row.paymentDueDay });
        resident.paymentDueDay = row.paymentDueDay;
      }

      // Find booking for this resident in this property
      const booking = allBookings.find(b => b.residentId === resident.id);

      await this.paymentRepo.save({
        residentId: resident.id,
        bookingId: booking?.id ?? null,
        propertyId: property.id,
        month: row.month,
        paymentDueDay: row.paymentDueDay,
        rentAmount: row.rentAmount,
        amountPaid: row.amountPaid,
        lateStatus: row.lateStatus,
        datePaid: row.datePaid,
        notes: row.notes,
        active: true,
      } as any);

      existingKeys.add(key);
      imported++;
    }

    return { imported, skipped, skipReasons };
  }
}
