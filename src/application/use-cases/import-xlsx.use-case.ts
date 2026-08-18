import { Inject, Injectable } from '@nestjs/common';
import { parseXlsx, ParsedRow } from '../../infrastructure/parsers/xlsx.parser';
import { Property } from '../../domain/property/property.entity';
import { Bed } from '../../domain/bed/bed.entity';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { IBedroomRepository, BEDROOM_REPOSITORY } from '../../domain/bedroom/bedroom.repository';

@Injectable()
export class ImportXlsxUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(BEDROOM_REPOSITORY) private readonly bedroomRepo: IBedroomRepository,
  ) {}

  async execute(buffer: Buffer): Promise<{ imported: number; historicalImported: number }> {
    const rows = parseXlsx(buffer);
    let imported = 0;
    // Caches bedroom lookups per property+letter for the duration of this import,
    // so repeated rows for the same physical bedroom don't race to create duplicates.
    const bedroomCache = new Map<string, string>();

    for (const row of rows) {
      const { bed } = await this.upsertPropertyAndBed(row, bedroomCache);

      // Clear existing bookings for this bed before re-importing
      await this.bookingRepo.deleteByBedId(bed.id);

      // Create current resident booking if name exists and is not a placeholder
      const currentName = row.residentName;
      if (currentName && currentName.toLowerCase() !== 'resident full name') {
        const resident = await this.residentRepo.save({
          fullName: currentName,
          email: row.residentEmail,
          telephone: row.residentTelephone,
          nationality: row.residentNationality,
          personalId: row.residentPersonalId,
          iban: row.residentIban,
          emergencyContact: row.residentEmergencyContact,
          source: row.residentSource,
        });

        const today = new Date();
        const contractEnd = row.contractEndDate;
        const checkOut = row.checkOutDate;
        const isCompleted = checkOut && checkOut < today;

        const bookingStatus = isCompleted ? 'completed' : 'active';
        await this.bookingRepo.save({
          bedId: bed.id,
          residentId: resident.id,
          checkInDate: row.checkInDate,
          contractEndDate: contractEnd,
          checkOutDate: checkOut,
          depositAmount: row.depositAmount,
          rentAmount: row.rentAmount,
          isHeadResident: row.residentIsHead,
          isTemporary: false,
          status: bookingStatus,
          comments: row.comments,
        });
        if (bookingStatus === 'active') {
          await this.bedRepo.save({ id: bed.id, status: 'allocated' });
        }
      }

      // Create temporary/upcoming resident booking if present
      const tempName = row.tempResidentName;
      if (tempName && tempName.toLowerCase() !== 'new resident' && tempName.toLowerCase() !== 'resident full name') {
        const tempResident = await this.residentRepo.save({
          fullName: tempName,
          email: row.tempResidentEmail,
          telephone: row.tempResidentTelephone,
          nationality: row.tempResidentNationality,
          personalId: row.tempResidentPersonalId,
          iban: row.tempResidentIban,
          emergencyContact: row.tempResidentEmergencyContact,
          source: row.tempResidentSource,
        });

        await this.bookingRepo.save({
          bedId: bed.id,
          residentId: tempResident.id,
          checkInDate: row.tempCheckInDate,
          contractEndDate: row.tempContractEndDate,
          depositAmount: row.tempDepositAmount ?? 0,
          rentAmount: row.tempRentAmount ?? 0,
          isHeadResident: row.tempResidentIsHead,
          isTemporary: true,
          status: 'upcoming',
          comments: null,
        });
      }

      imported++;
    }

    const historicalImported = await this.importCheckedOut(buffer, bedroomCache);

    return { imported, historicalImported };
  }

  // The CheckedOut sheet shares the exact column layout of the Control sheet, but every
  // row represents a resident who has already moved out — imported as a 'completed'
  // booking so occupancy history survives even after Control is re-imported (which wipes
  // and recreates each bed's active/upcoming bookings).
  private async importCheckedOut(buffer: Buffer, bedroomCache: Map<string, string>): Promise<number> {
    const rows = parseXlsx(buffer, 'CheckedOut', false);
    let imported = 0;

    for (const row of rows) {
      const residentName = row.residentName;
      if (!residentName || residentName.toLowerCase() === 'resident full name') continue;
      if (!row.checkOutDate) continue;

      const { bed } = await this.upsertPropertyAndBed(row, bedroomCache);

      const existingBookings = await this.bookingRepo.findByBedId(bed.id);
      const alreadyImported = existingBookings.some(
        b =>
          b.status === 'completed' &&
          dateKey(b.checkInDate) === dateKey(row.checkInDate) &&
          dateKey(b.checkOutDate) === dateKey(row.checkOutDate),
      );
      if (alreadyImported) continue;

      const resident = await this.residentRepo.save({
        fullName: residentName,
        email: row.residentEmail,
        telephone: row.residentTelephone,
        nationality: row.residentNationality,
        personalId: row.residentPersonalId,
        iban: row.residentIban,
        emergencyContact: row.residentEmergencyContact,
        source: row.residentSource,
      });

      await this.bookingRepo.save({
        bedId: bed.id,
        residentId: resident.id,
        checkInDate: row.checkInDate,
        contractEndDate: row.contractEndDate,
        checkOutDate: row.checkOutDate,
        depositAmount: row.depositAmount,
        rentAmount: row.rentAmount,
        isHeadResident: row.residentIsHead,
        isTemporary: false,
        status: 'completed',
        comments: row.comments,
      });

      imported++;
    }

    return imported;
  }

  private async upsertPropertyAndBed(
    row: ParsedRow,
    bedroomCache: Map<string, string>,
  ): Promise<{ property: Property; bed: Bed }> {
    const property = await this.propertyRepo.upsertByCode({
      code: row.code,
      bu: row.bu,
      area: row.area,
      fullAddress: row.fullAddress,
      keysCount: row.keysCount,
      securityKeysCount: row.securityKeysCount,
      fobCount: row.fobCount,
      electricityStatus: row.electricityStatus,
      gasStatus: row.gasStatus,
    });

    const bedroomId = row.bedroomLetter
      ? await this.ensureBedroom(property.id, row.bedroomLetter, bedroomCache)
      : null;

    const bed = await this.bedRepo.upsertByPropertyAndNumber({
      propertyId: property.id,
      bedNumber: row.bedNumber,
      bedroomId,
      bedroomType: row.bedroomType,
      sex: row.sex,
      bedSize: row.bedSize,
      depositAmount: row.depositAmount,
      rentAmount: row.rentAmount,
    });

    return { property, bed };
  }

  private async ensureBedroom(propertyId: string, letter: string, cache: Map<string, string>): Promise<string> {
    const cacheKey = `${propertyId}:${letter}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const name = `Bedroom ${letter}`;
    const existing = await this.bedroomRepo.findByPropertyAndName(propertyId, name);
    const bedroom = existing ?? (await this.bedroomRepo.save({ propertyId, name, active: true }));
    cache.set(cacheKey, bedroom.id);
    return bedroom.id;
  }
}

function dateKey(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
