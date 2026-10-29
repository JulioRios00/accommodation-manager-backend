import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseDeposits } from '../../infrastructure/parsers/deposits.parser';
import { IDepositTransactionRepository, DEPOSIT_TRANSACTION_REPOSITORY } from '../../domain/deposit-transaction/deposit-transaction.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { bedroomLetterFromName } from '../../domain/bed/bed-code.util';

export interface ImportSkipReason {
  identifier: string;
  reason: string;
  /** Where the rejected row sits in the uploaded workbook, when the importer knows.
   *  Optional because the deposits importer does not track it. */
  sheet?: string;
  row?: number;
  /** The cell value that was rejected, and enough of the row to recognise it by eye. */
  value?: string | null;
  context?: string | null;
}

@Injectable()
export class ImportDepositsUseCase {
  private readonly logger = new Logger(ImportDepositsUseCase.name);

  constructor(
    @Inject(DEPOSIT_TRANSACTION_REPOSITORY) private readonly txRepo: IDepositTransactionRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
  ) {}

  async execute(buffer: Buffer): Promise<{ imported: number; updated: number; skipped: number; skipReasons: ImportSkipReason[] }> {
    const rows = parseDeposits(buffer);
    const properties = await this.propertyRepo.findAll();
    const byCode = new Map(properties.map(p => [p.code.toLowerCase(), p]));
    const residents = await this.residentRepo.findAll();
    const byName = new Map(residents.map(r => [r.fullName.toLowerCase().trim(), r]));

    // Beds grouped by property+number — a bed number alone can match more than one bed
    // (e.g. A1 and B1 both have bedNumber 1), so the bedroom letter is needed to pick the
    // right one when the sheet provides one.
    const allBeds = await this.bedRepo.findAll();
    const bedsByPropertyAndNumber = new Map<string, typeof allBeds>();
    for (const bed of allBeds) {
      const key = `${bed.propertyId}|${bed.bedNumber}`;
      const list = bedsByPropertyAndNumber.get(key);
      if (list) list.push(bed);
      else bedsByPropertyAndNumber.set(key, [bed]);
    }

    // Index existing transactions by their natural key. A row that matches one is treated as
    // a restatement of it rather than a duplicate to drop, so re-importing the sheet after
    // correcting it (e.g. filling in the processed dates) brings the existing rows up to date.
    const existing = await this.txRepo.findAll();
    const existingByKey = new Map(
      existing.map(t => [`${t.propertyId}|${t.residentName.toLowerCase()}|${t.type}|${String(t.depositAmount)}`, t]),
    );

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const skipReasons: ImportSkipReason[] = [];
    const skip = (identifier: string, reason: string) => {
      skipped++;
      skipReasons.push({ identifier, reason });
      this.logger.warn(`[import-deposits] skip ${identifier}: ${reason}`);
    };

    for (const row of rows) {
      const identifier = `${row.propertyCode} / ${row.residentName}`;
      const property = byCode.get(row.propertyCode.toLowerCase());
      if (!property) { skip(identifier, `Property "${row.propertyCode}" not found`); continue; }

      const key = `${property.id}|${row.residentName.toLowerCase()}|${row.transactionType}|${String(row.depositAmount)}`;
      const existingTx = existingByKey.get(key);

      // Look up bed if bed number provided — disambiguate by bedroom letter when the sheet
      // gives one (e.g. "A1"). The transaction itself still gets imported either way; only
      // the bed link is affected.
      let bedId: string | null = null;
      if (row.bedNumber) {
        const candidates = bedsByPropertyAndNumber.get(`${property.id}|${row.bedNumber}`) ?? [];
        if (row.bedroomLetter) {
          const bed = candidates.find(b => bedroomLetterFromName(b.bedroomName) === row.bedroomLetter);
          bedId = bed?.id ?? null;
          if (!bed && candidates.length > 0) {
            this.logger.warn(
              `[import-deposits] ${identifier}: no bed "${row.bedroomLetter}${row.bedNumber}" found (property has bed(s) numbered ${row.bedNumber} in a different bedroom) — transaction imported without a bed link`,
            );
          }
        } else {
          // No bedroom info on this row — fall back to whichever match comes first, same
          // as before for sheets that only ever had plain numbers.
          bedId = candidates[0]?.id ?? null;
        }
      }

      // Look up resident by name
      const resident = byName.get(row.residentName.toLowerCase().trim());

      const fields = {
        type: row.transactionType,
        propertyId: property.id,
        residentName: row.residentName,
        checkoutDate: row.checkoutDate,
        depositAmount: row.depositAmount,
        proRataRentAmount: row.proRataRentAmount,
        iban: row.iban,
        payeeAddress: row.payeeAddress,
        status: row.status,
        dateProcessed: row.dateProcessed,
        bankReference: row.bankReference,
        company: row.company,
        comments: row.comments,
      };

      if (existingTx) {
        // The repository merges onto the loaded row and merge ignores undefined, so the
        // fields the sheet doesn't carry — bookingId, refundDueDate, completedBy(Name) and
        // the audit columns — are left as they are. The resident and bed links are only
        // written when this sheet actually resolved one, so a name that no longer matches
        // doesn't unlink a row that was already linked (see backfill-deposit-residents).
        await this.txRepo.save({
          id: existingTx.id,
          ...fields,
          ...(resident ? { residentId: resident.id } : {}),
          ...(bedId ? { bedId } : {}),
        } as any);
        updated++;
        continue;
      }

      const created = await this.txRepo.save({
        ...fields,
        residentId: resident?.id ?? null,
        bedId,
        active: true,
      } as any);

      // Index the new row so repeated rows within this one sheet update it rather than
      // inserting again.
      existingByKey.set(key, created);
      imported++;
    }

    return { imported, updated, skipped, skipReasons };
  }
}
