import { Inject, Injectable } from '@nestjs/common';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { IBedRateHistoryRepository, BED_RATE_HISTORY_REPOSITORY } from '../../domain/bed-rate-history/bed-rate-history.repository';
import { BookingBed } from '../../domain/booking/booking.entity';
import { bedroomLetterFromName } from '../../domain/bed/bed-code.util';

// Under the letter-first numbering convention (A1, B1, ...), bed number resets per bedroom,
// so the bedroom letter must be included to keep the code unique/readable (matches the
// frontend's lib/bedCode.ts).
function bedCode(bed: BookingBed): string {
  return `${bed.propertyCode ?? ''}-${bedroomLetterFromName(bed.bedroomName) ?? ''}${bed.bedNumber}`;
}

export interface PortfolioSnapshotRow {
  propertyCode: string;
  propertyLeaseActive: boolean;
  bedCode: string;
  residentName: string;
  checkInDate: Date | null;
  endDate: Date | null;
  rentAmount: number;
}

@Injectable()
export class GetPortfolioSnapshotUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(BED_RATE_HISTORY_REPOSITORY) private readonly rateHistoryRepo: IBedRateHistoryRepository,
  ) {}

  async execute(asOfDate: string): Promise<PortfolioSnapshotRow[]> {
    // Noon, matching the same day-delimiter used for booking status transitions elsewhere.
    const asOf = new Date(`${asOfDate}T12:00:00`);

    const [allBookings, properties, rates] = await Promise.all([
      this.bookingRepo.findAll(),
      this.propertyRepo.findAll(true),
      this.rateHistoryRepo.findAsOf(asOf),
    ]);

    const propertyById = new Map(properties.map(p => [p.id, p]));
    const rateByBedId = new Map(rates.map(r => [r.bedId, r]));

    const rowsAtDate = allBookings.filter(b => {
      if (!b.checkInDate || b.checkInDate > asOf) return false;
      const end = b.checkOutDate ?? b.contractEndDate;
      return !end || asOf <= end;
    });

    return rowsAtDate.map(b => {
      const property = b.bed ? propertyById.get(b.bed.propertyId) : undefined;
      const leaseActive =
        !!property &&
        (!property.leaseStartDate || asOf >= property.leaseStartDate) &&
        (!property.leaseEndDate || asOf <= property.leaseEndDate);
      const rate = b.bed ? rateByBedId.get(b.bed.id) : undefined;

      return {
        propertyCode: b.bed?.propertyCode ?? '—',
        propertyLeaseActive: property ? leaseActive : true, // no lease dates on file — treat as active
        bedCode: b.bed ? bedCode(b.bed) : '—',
        residentName: b.resident?.fullName ?? '—',
        checkInDate: b.checkInDate,
        endDate: b.checkOutDate ?? b.contractEndDate,
        rentAmount: rate?.rentAmount ?? b.rentAmount,
      };
    });
  }
}
