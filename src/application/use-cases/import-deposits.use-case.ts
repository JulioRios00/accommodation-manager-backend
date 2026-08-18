import { Inject, Injectable } from '@nestjs/common';
import { parseDeposits } from '../../infrastructure/parsers/deposits.parser';
import { IDepositTransactionRepository, DEPOSIT_TRANSACTION_REPOSITORY } from '../../domain/deposit-transaction/deposit-transaction.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';

@Injectable()
export class ImportDepositsUseCase {
  constructor(
    @Inject(DEPOSIT_TRANSACTION_REPOSITORY) private readonly txRepo: IDepositTransactionRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
  ) {}

  async execute(buffer: Buffer): Promise<{ imported: number; skipped: number }> {
    const rows = parseDeposits(buffer);
    const properties = await this.propertyRepo.findAll();
    const byCode = new Map(properties.map(p => [p.code.toLowerCase(), p]));
    const residents = await this.residentRepo.findAll();
    const byName = new Map(residents.map(r => [r.fullName.toLowerCase().trim(), r]));

    // Collect existing transactions to avoid exact duplicates
    const existing = await this.txRepo.findAll();
    const existingKeys = new Set(
      existing.map(t => `${t.propertyId}|${t.residentName.toLowerCase()}|${t.type}|${String(t.depositAmount)}`),
    );

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const property = byCode.get(row.propertyCode.toLowerCase());
      if (!property) { skipped++; continue; }

      const key = `${property.id}|${row.residentName.toLowerCase()}|${row.transactionType}|${String(row.depositAmount)}`;
      if (existingKeys.has(key)) { skipped++; continue; }

      // Look up bed if bed number provided
      let bedId: string | null = null;
      if (row.bedNumber) {
        const bed = await this.bedRepo.findByPropertyAndNumber(property.id, row.bedNumber);
        bedId = bed?.id ?? null;
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

    return { imported, skipped };
  }
}
