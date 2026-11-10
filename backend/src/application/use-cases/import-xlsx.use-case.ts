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
import { isInactiveBedroomLetter } from '../../domain/bed/bed-code.util';

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
  /** Rows dropped beyond the detail cap: counted on the summary, absent from the list. */
  detailTruncated?: number;
}

/** Counts rows by reason without the caller having to pre-declare the reasons. */
class DropTally {
  private readonly counts = new Map<string, number>();
  add(reason: string) { this.counts.set(reason, (this.counts.get(reason) ?? 0) + 1); }
  get total() { return [...this.counts.values()].reduce((a, b) => a + b, 0); }
  toRecord(): Record<string, number> { return Object.fromEntries([...this.counts.entries()]); }
}

/** Options for recording a dropped row. */
interface DropOptions {
  /** The full sentence for the detail list, when the summary bucket is too terse to act on. */
  detail?: string;
  /** Defaults to 'error'. See ImportSkipReason.severity. */
  severity?: 'error' | 'info';
  /** The cell value that caused the drop. */
  value?: string | null;
}

/**
 * Upper bound on the per-row detail list.
 *
 * The counts are always complete; this caps only the itemised list, which is carried in
 * the job result and handed back to the browser on every status poll. A misaligned parser
 * can drop every row of a 2,100-row sheet, and an unbounded list would make the failure
 * expensive to report as well as to suffer.
 */
const MAX_DETAIL_ROWS = 3000;

/** One bucket for genuinely empty rows, whichever guard catches them first. */
const BLANK_ROW = 'blank row (nothing in it)';
const BLANK_ROW_DETAIL = 'Empty row — nothing to import, and nothing to correct';

// Column M (Sex) on the Control sheet — 'M'/'F' — doubles as the resident's own gender.
function mapGender(sex: string | null | undefined): string | null {
  const s = sex?.trim().toUpperCase();
  if (s === 'M') return 'Male';
  if (s === 'F') return 'Female';
  return null;
}

/** Enough of a row for someone to find it in the spreadsheet without opening it. */
function describeRow(row: ParsedRow): string {
  return [row.code, row.bedNumberRaw ?? row.bedroomType, row.residentName].filter(Boolean).join(' · ');
}

/**
 * A row with nothing of its own in it.
 *
 * The property columns (A-J) are carried forward from the last filled row, so `code` is
 * populated even on the trailing filler rows below a sheet's real data — it cannot be
 * used to tell a blank row from a real one. Only the per-row columns can.
 */
function isBlankRow(row: ParsedRow): boolean {
  return (
    !row.bedNumberRaw &&
    !row.residentName &&
    !row.tempResidentName &&
    !row.checkInDate &&
    !row.checkOutDate &&
    !row.rentAmount &&
    !row.depositAmount &&
    !row.comments
  );
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
    let detailTruncated = 0;
    /**
     * Records one row that did not make it in: counted on the summary under `bucket`, and
     * listed individually by sheet and Excel row number so the person correcting the file
     * can go straight to the line. Every drop goes through here — a bucket that only
     * incremented a counter is exactly how 2,153 rows once vanished without a trace.
     */
    const drop = (tally: DropTally, row: ParsedRow, bucket: string, opts: DropOptions = {}) => {
      const severity = opts.severity ?? 'error';
      tally.add(bucket);
      if (severity === 'error') skipped++;
      if (skipReasons.length < MAX_DETAIL_ROWS) {
        skipReasons.push({
          identifier: row.code || '—',
          reason: opts.detail ?? bucket,
          bucket,
          severity,
          sheet: row.sourceSheet,
          row: row.sourceRow,
          value: opts.value ?? null,
          context: describeRow(row),
        });
      } else {
        detailTruncated++;
      }
      if (severity === 'error') {
        this.logger.warn(
          `[import-xlsx] skip ${row.sourceSheet} row ${row.sourceRow} (${row.code || 'no code'}): ${opts.detail ?? bucket}`,
        );
      }
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
          drop(controlDropped, row, 'unrecognized bed number', {
            detail: 'Unrecognized bed number (expected digits with an optional trailing letter, e.g. "12B")',
            value: row.bedNumberRaw,
          });
        } else if (isBlankRow(row)) {
          drop(controlDropped, row, BLANK_ROW, { detail: BLANK_ROW_DETAIL, severity: 'info' });
        } else {
          // Not filler: this row carries a resident, dates or an amount and only the bed
          // number is missing, so it is real data being lost. It was counted as a blank
          // row until Nov 2026, which is how it stayed invisible.
          drop(controlDropped, row, 'no bed number', {
            detail: 'Column K (Bed) is empty, so there is no bed to attach this row to',
          });
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
          // A Z bed with a resident in it is a contradiction in the sheet, not something to
          // resolve by quietly re-letting the bed. The booking is still imported; the bed
          // keeps the status the sheet gave it.
          if (bed.status !== 'inactive') {
            await this.bedRepo.save({ id: bed.id, status: 'allocated' });
          }
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

    const checkedOut = await this.importCheckedOut(buffer, bedroomCache, propertyStatuses, drop);

    const tallies = [
      this.tally('Control', rows.length, imported, controlDropped),
      this.tally('CheckedOut', checkedOut.rows, checkedOut.imported, checkedOut.dropped),
    ];
    for (const t of tallies) this.reportTally(t);
    if (detailTruncated > 0) {
      this.logger.warn(
        `[import-xlsx] ${detailTruncated} further dropped rows are counted but not listed individually ` +
        `(detail list capped at ${MAX_DETAIL_ROWS}).`,
      );
    }

    return {
      imported,
      historicalImported: checkedOut.imported,
      skipped,
      skipReasons,
      tallies,
      ...(detailTruncated > 0 ? { detailTruncated } : {}),
    };
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
    drop: (tally: DropTally, row: ParsedRow, bucket: string, opts?: DropOptions) => void,
  ): Promise<{ rows: number; imported: number; dropped: DropTally }> {
    const rows = parseXlsx(buffer, 'CheckedOut', false);
    const dropped = new DropTally();
    let imported = 0;

    for (const row of rows) {
      const residentName = row.residentName;
      if (!residentName || residentName.toLowerCase() === 'resident full name') {
        // A wholly empty filler row is housekeeping; one that carries a bed, dates or an
        // amount but no name is a real gap in the sheet and needs a name typing in.
        const blank = isBlankRow(row);
        drop(dropped, row, blank ? BLANK_ROW : 'no resident name', {
          detail: blank
            ? BLANK_ROW_DETAIL
            : 'Column R (Resident) is empty, so there is nobody to attach this stay to',
          severity: blank ? 'info' : 'error',
        });
        continue;
      }
      // This guard silently swallowed all 2,153 rows while the columns were misaligned,
      // because it read the Status column instead of Check-out. It is counted now.
      if (!row.checkOutDate) {
        drop(dropped, row, 'no check-out date', {
          detail:
            'Column AC (Check-out) is empty. Rows on CheckedOut are past stays, so without ' +
            'a check-out date there is no history to record — fill the date in, or move the ' +
            'row back to Control if the resident is still in place.',
          severity: 'info',
        });
        continue;
      }
      if (row.bedNumber === null) {
        if (row.bedNumberRaw) {
          drop(dropped, row, 'unrecognized bed number', {
            detail: 'Unrecognized bed number (expected digits with an optional trailing letter, e.g. "12B")',
            value: row.bedNumberRaw,
          });
        } else if (isBlankRow(row)) {
          drop(dropped, row, BLANK_ROW, { detail: BLANK_ROW_DETAIL, severity: 'info' });
        } else {
          drop(dropped, row, 'no bed number', {
            detail: 'Column K (Bed) is empty, so there is no bed to attach this stay to',
          });
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
        drop(dropped, row, 'already imported', {
          detail:
            'This stay is already recorded (same bed, check-in and check-out), so the row ' +
            'was left as it is. Expected on a re-import; two rows here with identical dates ' +
            'means one of them is a duplicate in the sheet.',
          severity: 'info',
        });
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

    // Status is normally left alone on upsert, so a re-import doesn't wipe out which beds
    // are currently allocated. A Z bedroom is the exception: it describes the bed itself,
    // so it is applied on every import — unless someone has since set the status by hand,
    // in which case the system wins and the sheet is ignored for this bed.
    const existing = await this.bedRepo.findByPropertyAndNumber(property.id, row.bedNumber);
    const manual = existing?.statusSetManually ?? false;
    const inactive = isInactiveBedroomLetter(row.bedroomLetter);
    const bed = await this.bedRepo.upsertByPropertyAndNumber({
      propertyId: property.id,
      bedNumber: row.bedNumber,
      bedroomId,
      bedroomType: row.bedroomType,
      sex: row.sex,
      bedSize: row.bedSize,
      depositAmount: row.depositAmount,
      rentAmount: row.rentAmount,
      ...(inactive && !manual ? { status: 'inactive' as const } : {}),
    });

    // The reverse correction: a bed that is no longer a Z has to become lettable again, or
    // the sheet could mark a bed inactive but never undo it. It returns to `vacant`, not to
    // whatever it was before — `inactive` is a third state, not a flavour of vacant, so
    // there is nothing to restore. If someone is actually in it, the booking pass below
    // sets `allocated`.
    if (!inactive && !manual && bed.status === 'inactive') {
      return { property, bed: await this.bedRepo.save({ id: bed.id, status: 'vacant' }) };
    }

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
