import { Inject, Injectable } from '@nestjs/common';
import { parseLandlordPayments } from '../../infrastructure/parsers/landlord-payments.parser';
import { ILandlordPaymentRepository, LANDLORD_PAYMENT_REPOSITORY } from '../../domain/landlord-payment/landlord-payment.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { ILandlordRepository, LANDLORD_REPOSITORY } from '../../domain/landlord/landlord.repository';

@Injectable()
export class ImportLandlordPaymentsUseCase {
  constructor(
    @Inject(LANDLORD_PAYMENT_REPOSITORY) private readonly paymentRepo: ILandlordPaymentRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(LANDLORD_REPOSITORY) private readonly landlordRepo: ILandlordRepository,
  ) {}

  async execute(buffer: Buffer): Promise<{ imported: number; skipped: number }> {
    const rows = parseLandlordPayments(buffer);
    const properties = await this.propertyRepo.findAll();
    const byCode = new Map(properties.map(p => [p.code.toLowerCase(), p]));
    const landlords = await this.landlordRepo.findAll();
    const landlordByName = new Map(landlords.map(l => [l.name.toLowerCase(), l]));

    // Existing payments for duplicate detection
    const existing = await this.paymentRepo.findAll();
    const existingKeys = new Set(existing.map(p => `${p.propertyId}|${p.month}`));

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const property = byCode.get(row.propertyCode.toLowerCase());
      if (!property) { skipped++; continue; }

      const key = `${property.id}|${row.month}`;
      if (existingKeys.has(key)) { skipped++; continue; }

      // Find or create landlord by beneficiary/supplier name
      const landlordName = row.beneficiaryName ?? row.supplier ?? '';
      let landlord = landlordByName.get(landlordName.toLowerCase());
      if (!landlord && landlordName) {
        landlord = await this.landlordRepo.save({ name: landlordName, iban: row.iban, active: true } as any);
        landlordByName.set(landlordName.toLowerCase(), landlord);
      }

      await this.paymentRepo.save({
        propertyId: property.id,
        landlordId: landlord?.id ?? '',
        month: row.month,
        amountDue: row.amountDue,
        amountPaid: row.status === 'paid' ? row.amountDue : 0,
        iban: row.iban,
        status: row.status,
        beneficiaryName: row.beneficiaryName,
        paymentReference: row.paymentReference,
        notes: row.notes,
        active: true,
      } as any);

      existingKeys.add(key);
      imported++;
    }

    return { imported, skipped };
  }
}
