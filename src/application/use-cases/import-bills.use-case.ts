import { Inject, Injectable } from '@nestjs/common';
import { parseBills } from '../../infrastructure/parsers/bills.parser';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { Property } from '../../domain/property/property.entity';

@Injectable()
export class ImportBillsUseCase {
  constructor(@Inject(PROPERTY_REPOSITORY) private readonly repo: IPropertyRepository) {}

  async execute(buffer: Buffer): Promise<{ updated: number; skipped: number }> {
    const parsed = parseBills(buffer);
    const all = await this.repo.findAll();
    const byCode = new Map(all.map(p => [p.code.toLowerCase(), p]));
    const byAddress = new Map(all.map(p => [p.fullAddress?.toLowerCase() ?? '', p]));

    let updated = 0;
    let skipped = 0;

    // Electricity + Gas (matched by address)
    for (const row of parsed.electricityGas) {
      const prop = this.findByAddress(row.propertyAddress, byAddress, all);
      if (!prop) { skipped++; continue; }
      await this.repo.save({
        ...prop,
        electricityMprn: row.electricityMprn ?? prop.electricityMprn,
        electricitySupplier: row.electricitySupplier ?? prop.electricitySupplier,
        electricityAccountNumber: row.electricityAccountNumber ?? prop.electricityAccountNumber,
        electricityKeypadCode: row.electricityKeypadCode ?? prop.electricityKeypadCode,
        gasGprn: row.gasGprn ?? prop.gasGprn,
        gasSupplier: row.gasSupplier ?? prop.gasSupplier,
        gasAccountNumber: row.gasAccountNumber ?? prop.gasAccountNumber,
        gasPin: row.gasPin ?? prop.gasPin,
        crn: row.crn ?? prop.crn,
        propertyEmail: row.propertyEmail ?? prop.propertyEmail,
        keyCode: row.keyCode ?? prop.keyCode,
      } as Partial<Property>);
      updated++;
    }

    // Waste (matched by property code)
    for (const row of parsed.waste) {
      const prop = byCode.get(row.propertyCode.toLowerCase());
      if (!prop) { skipped++; continue; }
      await this.repo.save({
        ...prop,
        wasteSupplier: row.wasteSupplier ?? prop.wasteSupplier,
        wasteAccountNumber: row.wasteAccountNumber ?? prop.wasteAccountNumber,
        wasteEmail: row.wasteEmail ?? prop.wasteEmail,
        wastePhone: row.wastePhone ?? prop.wastePhone,
        wastePassword: row.wastePassword ?? prop.wastePassword,
        wastePaymentType: row.wastePaymentType ?? prop.wastePaymentType,
        wasteMonthlyAmount: row.wasteMonthlyAmount ?? prop.wasteMonthlyAmount,
        wasteStatus: row.wasteStatus ?? prop.wasteStatus,
      } as Partial<Property>);
      updated++;
    }

    // Internet (matched by property code)
    for (const row of parsed.internet) {
      const prop = byCode.get(row.propertyCode.toLowerCase());
      if (!prop) { skipped++; continue; }
      await this.repo.save({
        ...prop,
        internetSupplier: row.internetSupplier ?? prop.internetSupplier,
        internetAccountNumber: row.internetAccountNumber ?? prop.internetAccountNumber,
        internetEmail: row.internetEmail ?? prop.internetEmail,
        internetOnlineLink: row.internetOnlineLink ?? prop.internetOnlineLink,
        internetBusinessPhone: row.internetBusinessPhone ?? prop.internetBusinessPhone,
        internetUsername: row.internetUsername ?? prop.internetUsername,
        internetPassword: row.internetPassword ?? prop.internetPassword,
        internetPaymentType: row.internetPaymentType ?? prop.internetPaymentType,
        internetStatus: row.internetStatus ?? prop.internetStatus,
        internetContractEndDate: row.internetContractEndDate ?? prop.internetContractEndDate,
        internetNotes: row.internetNotes ?? prop.internetNotes,
      } as Partial<Property>);
      updated++;
    }

    return { updated, skipped };
  }

  private findByAddress(address: string, byAddress: Map<string, Property>, all: Property[]): Property | null {
    const lower = address.toLowerCase();
    const exact = byAddress.get(lower);
    if (exact) return exact;
    // Partial match: check if stored address contains the key parts of the row address
    return all.find(p => {
      const stored = p.fullAddress?.toLowerCase() ?? '';
      return stored && (stored.includes(lower.substring(0, 15)) || lower.includes(stored.substring(0, 15)));
    }) ?? null;
  }
}
