import { Inject, Injectable } from '@nestjs/common';
import { parseBills } from '../../infrastructure/parsers/bills.parser';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { Property } from '../../domain/property/property.entity';

@Injectable()
export class ImportBillsUseCase {
  constructor(@Inject(PROPERTY_REPOSITORY) private readonly repo: IPropertyRepository) {}

  async execute(buffer: Buffer): Promise<{ updated: number; skipped: number; gprnConflicts: number }> {
    const parsed = parseBills(buffer);
    const all = await this.repo.findAll();
    const byCode = new Map(all.map(p => [p.code.toLowerCase(), p]));
    const byAddress = new Map(all.map(p => [p.fullAddress?.toLowerCase() ?? '', p]));

    let updated = 0;
    let skipped = 0;
    let gprnConflicts = 0;

    // Electricity + Gas (matched by address)
    for (const row of parsed.electricityGas) {
      const prop = this.findByAddress(row.propertyAddress, byAddress, all);
      if (!prop) { skipped++; continue; }
      // Two properties cannot share the same GPRN, except "N/A" (used for properties
      // without gas). If the row's GPRN is already in use by another property, keep
      // the property's existing GPRN instead of overwriting it.
      let gasGprn = row.gasGprn ?? prop.gasGprn;
      if (row.gasGprn && this.isDuplicateGprn(row.gasGprn, prop.id, all)) {
        gasGprn = prop.gasGprn;
        gprnConflicts++;
      }
      // Mutate the shared property instance (referenced by both `byCode` and `byAddress`)
      // so that later loops over the same property see these fields instead of the stale
      // pre-import snapshot — otherwise a property present in more than one sheet has each
      // loop's changes overwritten by the next.
      Object.assign(prop, {
        electricityMprn: row.electricityMprn ?? prop.electricityMprn,
        electricitySupplier: row.electricitySupplier ?? prop.electricitySupplier,
        electricityAccountNumber: row.electricityAccountNumber ?? prop.electricityAccountNumber,
        electricityKeypadCode: row.electricityKeypadCode ?? prop.electricityKeypadCode,
        gasGprn,
        gasSupplier: row.gasSupplier ?? prop.gasSupplier,
        gasAccountNumber: row.gasAccountNumber ?? prop.gasAccountNumber,
        gasPin: row.gasPin ?? prop.gasPin,
        crn: row.crn ?? prop.crn,
        propertyEmail: row.propertyEmail ?? prop.propertyEmail,
        keyCode: row.keyCode ?? prop.keyCode,
      });
      await this.repo.save(prop);
      updated++;
    }

    // Waste (matched by property code)
    for (const row of parsed.waste) {
      const prop = byCode.get(row.propertyCode.toLowerCase());
      if (!prop) { skipped++; continue; }
      Object.assign(prop, {
        wasteSupplier: row.wasteSupplier ?? prop.wasteSupplier,
        wasteAccountNumber: row.wasteAccountNumber ?? prop.wasteAccountNumber,
        wasteEmail: row.wasteEmail ?? prop.wasteEmail,
        wastePhone: row.wastePhone ?? prop.wastePhone,
        wastePassword: row.wastePassword ?? prop.wastePassword,
        wastePaymentType: row.wastePaymentType ?? prop.wastePaymentType,
        wasteMonthlyAmount: row.wasteMonthlyAmount ?? prop.wasteMonthlyAmount,
        wasteStatus: row.wasteStatus ?? prop.wasteStatus,
      });
      await this.repo.save(prop);
      updated++;
    }

    // Internet (matched by property code)
    for (const row of parsed.internet) {
      const prop = byCode.get(row.propertyCode.toLowerCase());
      if (!prop) { skipped++; continue; }
      Object.assign(prop, {
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
      });
      await this.repo.save(prop);
      updated++;
    }

    return { updated, skipped, gprnConflicts };
  }

  private isDuplicateGprn(gprn: string, propertyId: string, all: Property[]): boolean {
    const normalized = gprn.trim().toUpperCase();
    if (normalized === 'N/A') return false;
    return all.some(p => p.id !== propertyId && p.gasGprn?.trim().toUpperCase() === normalized);
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
