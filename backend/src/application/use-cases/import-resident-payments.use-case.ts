import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseResidentPayments } from '../../infrastructure/parsers/resident-payments.parser';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { ImportSkipReason } from './import-deposits.use-case';
import { derivePaymentStatus } from '../../domain/rent-payment/rent-payment.entity';

@Injectable()
export class ImportResidentPaymentsUseCase {
  private readonly logger = new Logger(ImportResidentPaymentsUseCase.name);

  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly paymentRepo: IRentPaymentRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
  ) {}

  /**
   * Re-importing a month overwrites the payment already held for it: the tracking sheet is
   * the record of what was paid, so where the two disagree the sheet is right. That means a
   * correction made in the app since the last import is replaced, which is the agreed
   * trade-off — the alternative was never being able to correct an imported row from the
   * sheet at all.
   *
   * Only the columns the sheet actually carries are written. Fields the sheet knows nothing
   * about are left alone by the repository's merge — in particular the d1/d4 escalation
   * stamps, which are what stop a reminder going out twice.
   */
  async execute(buffer: Buffer): Promise<{ imported: number; updated: number; skipped: number; skipReasons: ImportSkipReason[] }> {
    const rows = parseResidentPayments(buffer);
    // A property out of lease is still the property these rows belong to — its bills,
    // tickets and payments carry on existing. Excluding it only turns real rows into
    // "property not found" skips, so the lookup covers every property.
    const properties = await this.propertyRepo.findAll(true);
    const byCode = new Map(properties.map(p => [p.code.toLowerCase(), p]));
    const residents = await this.residentRepo.findAll();
    const byName = new Map(residents.map(r => [r.fullName.toLowerCase().trim(), r]));
    const allBookings = await this.bookingRepo.findAll('active');

    // Keyed by property+resident+month so a row already held can be updated rather than
    // skipped. The id is what makes that possible, so this is a map, not a set.
    const existing = await this.paymentRepo.findAll();
    const existingByKey = new Map(existing.map(p => [`${p.propertyId}|${p.residentId}|${p.month}`, p]));

    let imported = 0;
    let updated = 0;
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
      const current = existingByKey.get(key);

      // Column C (TenantPaymentDay) is also the resident's own Payment Due Day, shown on
      // their profile — not just a per-month snapshot on the generated payment record.
      if (row.paymentDueDay != null && resident.paymentDueDay !== row.paymentDueDay) {
        await this.residentRepo.save({ id: resident.id, paymentDueDay: row.paymentDueDay });
        resident.paymentDueDay = row.paymentDueDay;
      }

      // Find booking for this resident in this property
      const booking = allBookings.find(b => b.residentId === resident.id);

      const saved = await this.paymentRepo.save({
        // Present on an update, absent on an insert — the repository merges when it is set.
        ...(current ? { id: current.id } : {}),
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
        // Derived, never imported: the sheet has no such column, and leaving it would let a
        // changed Amount Paid sit next to a status that contradicts it.
        paymentStatus: derivePaymentStatus(row.amountPaid, row.rentAmount),
        active: true,
      } as any);

      // Keep the map current so a second row for the same resident and month within one
      // sheet updates the row just written instead of inserting a duplicate beside it.
      existingByKey.set(key, saved);
      current ? updated++ : imported++;
    }

    return { imported, updated, skipped, skipReasons };
  }
}
