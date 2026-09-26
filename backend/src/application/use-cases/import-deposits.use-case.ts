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

  async execute(buffer: Buffer): Promise<{ imported: number; skipped: number; skipReasons: ImportSkipReason[] }> {
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

    // Collect existing transactions to avoid exact duplicates
    const existing = await this.txRepo.findAll();
    const existingKeys = new Set(
      existing.map(t => `${t.propertyId}|${t.residentName.toLowerCase()}|${t.type}|${String(t.depositAmount)}`),
    );

    let imported = 0;
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
      if (existingKeys.has(key)) { skip(identifier, 'Duplicate transaction (already imported)'); continue; }

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

      await this.txRepo.save({
        type: row.transactionType,
        residentId: resident?.id ?? null,
        propertyId: property.id,
        bedId,
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
        active: true,
      } as any);

      existingKeys.add(key);
      imported++;
    }

    return { imported, skipped, skipReasons };
  }
}
