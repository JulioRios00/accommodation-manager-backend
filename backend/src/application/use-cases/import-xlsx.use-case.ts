import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseXlsx, parsePropertyStatuses, ParsedRow } from '../../infrastructure/parsers/xlsx.parser';
import { Property } from '../../domain/property/property.entity';
import { Bed } from '../../domain/bed/bed.entity';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { IBedroomRepository, BEDROOM_REPOSITORY } from '../../domain/bedroom/bedroom.repository';
import { ILandlordRepository, LANDLORD_REPOSITORY } from '../../domain/landlord/landlord.repository';
import { ImportSkipReason } from './import-deposits.use-case';

/**
 * Where every parsed row of a sheet ended up.
 *
 * The counts exist because a misaligned parser once dropped 2,153 CheckedOut rows at a
 * `continue` that counted nothing, and the import reported success. A summary that only
 * names the rows it chose to complain about cannot show that kind of failure, so this
 * accounts for all of them: `imported` plus every bucket in `dropped` equals `rows`.
 */
export interface ImportSheetTally {
  sheet: string;
  rows: number;
  imported: number;
  /** Reason -> row count. Reasons with a zero count are omitted. */
  dropped: Record<string, number>;
  /** Non-zero means the buckets do not add up and this tally cannot be trusted. */
  unaccounted: number;
}

export interface ImportXlsxResult {
  imported: number;
  historicalImported: number;
  skipped: number;
  skipReasons: ImportSkipReason[];
  tallies: ImportSheetTally[];
}

/** Counts rows by reason without the caller having to pre-declare the reasons. */
class DropTally {
  private readonly counts = new Map<string, number>();
  add(reason: string) { this.counts.set(reason, (this.counts.get(reason) ?? 0) + 1); }
  get total() { return [...this.counts.values()].reduce((a, b) => a + b, 0); }
  toRecord(): Record<string, number> { return Object.fromEntries([...this.counts.entries()]); }
}

// Column M (Sex) on the Control sheet — 'M'/'F' — doubles as the resident's own gender.
function mapGender(sex: string | null | undefined): string | null {
  const s = sex?.trim().toUpperCase();
  if (s === 'M') return 'Male';
  if (s === 'F') return 'Female';
  return null;
}

@Injectable()
export class ImportXlsxUseCase {
  private readonly logger = new Logger(ImportXlsxUseCase.name);

  constructor(
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(BEDROOM_REPOSITORY) private readonly bedroomRepo: IBedroomRepository,
    @Inject(LANDLORD_REPOSITORY) private readonly landlordRepo: ILandlordRepository,
  ) {}

  async execute(buffer: Buffer): Promise<ImportXlsxResult> {
    const rows = parseXlsx(buffer);
    const propertyStatuses = parsePropertyStatuses(buffer);
    let imported = 0;
    let skipped = 0;
    const skipReasons: ImportSkipReason[] = [];
    const skip = (identifier: string, reason: string) => {
      skipped++;
      skipReasons.push({ identifier, reason });
      this.logger.warn(`[import-xlsx] skip ${identifier}: ${reason}`);
    };
    // Caches bedroom lookups per property+letter for the duration of this import,
    // so repeated rows for the same physical bedroom don't race to create duplicates.
    const bedroomCache = new Map<string, string>();
    const controlDropped = new DropTally();

    for (const row of rows) {
      if (row.bedNumber === null) {
        // Only flag rows that actually had bed-number content — trailing blank
        // filler rows below a sheet's real data also land here and aren't errors.
        if (row.bedNumberRaw) {
          skip(row.code, `Unrecognized bed number "${row.bedNumberRaw}" (expected digits with optional trailing letter, e.g. "12B")`);
          controlDropped.add('unrecognized bed number');
        } else {
          controlDropped.add('blank row (no bed number)');
        }
        continue;
      }

      const { bed } = await this.upsertPropertyAndBed(row, bedroomCache, propertyStatuses);

      // Clear existing bookings for this bed before re-importing
      await this.bookingRepo.deleteByBedId(bed.id);

      // Create current resident booking if name exists and is not a placeholder
      const currentName = row.residentName;
      if (currentName && currentName.toLowerCase() !== 'resident full name') {
        const resident = await this.upsertResident({
          fullName: currentName,
          email: row.residentEmail,
          telephone: row.residentTelephone,
          nationality: row.residentNationality,
          personalId: row.residentPersonalId,
          iban: row.residentIban,
          emergencyContact: row.residentEmergencyContact,
          source: row.residentSource,
          gender: mapGender(row.sex),
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
        const tempResident = await this.upsertResident({
          fullName: tempName,
          email: row.tempResidentEmail,
          telephone: row.tempResidentTelephone,
          nationality: row.tempResidentNationality,
          personalId: row.tempResidentPersonalId,
          iban: row.tempResidentIban,
          emergencyContact: row.tempResidentEmergencyContact,
          source: row.tempResidentSource,
          gender: mapGender(row.sex),
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

    const checkedOut = await this.importCheckedOut(buffer, bedroomCache, propertyStatuses, skip);

    const tallies = [
      this.tally('Control', rows.length, imported, controlDropped),
      this.tally('CheckedOut', checkedOut.rows, checkedOut.imported, checkedOut.dropped),
    ];
    for (const t of tallies) this.reportTally(t);

    return { imported, historicalImported: checkedOut.imported, skipped, skipReasons, tallies };
  }

  private tally(sheet: string, rows: number, imported: number, dropped: DropTally): ImportSheetTally {
    return { sheet, rows, imported, dropped: dropped.toRecord(), unaccounted: rows - imported - dropped.total };
  }

  /** The log line that would have made the September regression obvious on day one. */
  private reportTally(t: ImportSheetTally) {
    const breakdown = Object.entries(t.dropped).map(([r, n]) => `${n} ${r}`).join(', ') || 'none dropped';
    this.logger.log(`[import-xlsx] ${t.sheet}: ${t.rows} rows, ${t.imported} imported (${breakdown})`);
    // "Imported nothing" is only alarming when nothing was recognised either. A re-import
    // of an unchanged sheet legitimately imports nothing, and must not cry wolf.
    const recognised = t.dropped['already imported'] ?? 0;
    if (t.rows > 0 && t.imported === 0 && recognised === 0) {
      this.logger.error(
        `[import-xlsx] ${t.sheet}: parsed ${t.rows} rows and imported NONE. ` +
        `This usually means the sheet's columns no longer line up with the parser.`,
      );
    }
    if (t.unaccounted !== 0) {
      this.logger.error(`[import-xlsx] ${t.sheet}: ${t.unaccounted} rows unaccounted for — the tally is wrong, not the sheet.`);
    }
  }

  // The CheckedOut sheet shares the exact column layout of the Control sheet, but every
  // row represents a resident who has already moved out — imported as a 'completed'
  // booking so occupancy history survives even after Control is re-imported (which wipes
  // and recreates each bed's active/upcoming bookings).
  private async importCheckedOut(
    buffer: Buffer,
    bedroomCache: Map<string, string>,
    propertyStatuses: Map<string, boolean>,
    skip: (identifier: string, reason: string) => void,
  ): Promise<{ rows: number; imported: number; dropped: DropTally }> {
    const rows = parseXlsx(buffer, 'CheckedOut', false);
    const dropped = new DropTally();
    let imported = 0;

    for (const row of rows) {
      const residentName = row.residentName;
      if (!residentName || residentName.toLowerCase() === 'resident full name') {
        dropped.add('no resident name');
        continue;
      }
      // This guard silently swallowed all 2,153 rows while the columns were misaligned,
      // because it read the Status column instead of Check-out. It is counted now.
      if (!row.checkOutDate) {
        dropped.add('no check-out date');
        continue;
      }
      if (row.bedNumber === null) {
        if (row.bedNumberRaw) {
          skip(row.code, `[CheckedOut] Unrecognized bed number "${row.bedNumberRaw}" (expected digits with optional trailing letter, e.g. "12B")`);
          dropped.add('unrecognized bed number');
        } else {
          dropped.add('blank row (no bed number)');
        }
        continue;
      }

      const { bed } = await this.upsertPropertyAndBed(row, bedroomCache, propertyStatuses);

      const existingBookings = await this.bookingRepo.findByBedId(bed.id);
      const alreadyImported = existingBookings.some(
        b =>
          b.status === 'completed' &&
          dateKey(b.checkInDate) === dateKey(row.checkInDate) &&
          dateKey(b.checkOutDate) === dateKey(row.checkOutDate),
      );
      if (alreadyImported) {
        // Already in the database from an earlier import, or a duplicate row within this
        // sheet. Expected on a re-import, but it is a count, not a non-event.
        dropped.add('already imported');
        continue;
      }

      const resident = await this.upsertResident({
        fullName: residentName,
        email: row.residentEmail,
        telephone: row.residentTelephone,
        nationality: row.residentNationality,
        personalId: row.residentPersonalId,
        iban: row.residentIban,
        emergencyContact: row.residentEmergencyContact,
        source: row.residentSource,
        gender: mapGender(row.sex),
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

    return { rows: rows.length, imported, dropped };
  }

  private async upsertPropertyAndBed(
    row: ParsedRow & { bedNumber: number },
    bedroomCache: Map<string, string>,
    propertyStatuses: Map<string, boolean>,
  ): Promise<{ property: Property; bed: Bed }> {
    // Find or create landlord if name is provided
    let landlordId: string | null = null;
    if (row.landlordPayeeName && row.landlordPayeeName.toLowerCase() !== 'landlord name') {
      const landlord = await this.findOrCreateLandlord(row.landlordPayeeName);
      landlordId = landlord.id;
    }

    const property = await this.propertyRepo.upsertByCode({
      code: row.code,
      eirCode: row.eirCode,
      bu: row.bu,
      area: row.area,
      fullAddress: row.fullAddress,
      keysCount: row.keysCount,
      securityKeysCount: row.securityKeysCount,
      fobCount: row.fobCount,
      electricityStatus: row.electricityStatus,
      gasStatus: row.gasStatus,
      landlordPaymentDueDay: row.landlordPaymentDueDay,
      residentPaymentDueDay: row.residentPaymentDueDay,
      landlordId,
      // Falls back to the prior "always reactivate on import" behavior when the sheet
      // doesn't cover this property (sheet missing, or code not listed in it yet).
      active: propertyStatuses.get(row.code) ?? true,
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

  // Matches an existing resident by email or telephone (in that order) so re-imports
  // and repeated occupants across properties update one record instead of creating
  // a fresh duplicate every time.
  private async upsertResident(data: {
    fullName: string;
    email: string | null;
    telephone: string | null;
    nationality: string | null;
    personalId: string | null;
    iban: string | null;
    emergencyContact: string | null;
    source: string | null;
    gender?: string | null;
  }) {
    const existing =
      (data.email && (await this.residentRepo.findByEmail(data.email))) ||
      (data.telephone && (await this.residentRepo.findByTelephone(data.telephone))) ||
      null;

    return existing
      ? this.residentRepo.save({ ...data, id: existing.id })
      : this.residentRepo.save(data);
  }

  // Find existing landlord by name or create new one if not found.
  // Matches by exact name match (case-insensitive) to avoid duplicates.
  private async findOrCreateLandlord(name: string) {
    const allLandlords = await this.landlordRepo.findAll();
    const existing = allLandlords.find(l => l.name?.toLowerCase() === name.toLowerCase());

    if (existing) return existing;

    return this.landlordRepo.save({
      name,
      email: null,
      bankName: null,
      iban: null,
      paymentMethod: null,
    });
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
