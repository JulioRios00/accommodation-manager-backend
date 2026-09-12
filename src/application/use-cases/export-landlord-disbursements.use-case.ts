import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ILandlordPaymentRepository, LANDLORD_PAYMENT_REPOSITORY } from '../../domain/landlord-payment/landlord-payment.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { ILandlordRepository, LANDLORD_REPOSITORY } from '../../domain/landlord/landlord.repository';
import { isValidIban, isValidBic } from '../../domain/landlord-payment/iban-bic.util';
import { paymentDescription } from '../../domain/landlord-payment/payment-description.util';

function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

@Injectable()
export class ExportLandlordDisbursementsUseCase {
  constructor(
    @Inject(LANDLORD_PAYMENT_REPOSITORY) private readonly paymentRepo: ILandlordPaymentRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(LANDLORD_REPOSITORY) private readonly landlordRepo: ILandlordRepository,
  ) {}

  async execute(ids: string[]): Promise<string> {
    if (!ids.length) throw new BadRequestException('No rows selected for export');

    const rows = await Promise.all(ids.map((id) => this.paymentRepo.findById(id)));
    const missing = ids.filter((id, i) => !rows[i]);
    if (missing.length) throw new BadRequestException(`Rows not found: ${missing.join(', ')}`);

    const errors: string[] = [];
    const csvRows: string[] = [];

    for (const payment of rows) {
      const p = payment!;
      if (p.status === 'paid') {
        errors.push(`${p.id}: already marked Paid — cannot be re-exported`);
        continue;
      }

      const [property, landlord] = await Promise.all([
        this.propertyRepo.findById(p.propertyId),
        p.landlordId ? this.landlordRepo.findById(p.landlordId) : Promise.resolve(null),
      ]);

      const iban = p.iban || landlord?.iban || '';
      const bic = p.bic || landlord?.bic || '';
      const payee = p.beneficiaryName || landlord?.name || '';
      const reference = p.paymentReference || paymentDescription(p.month, property?.code ?? '');

      if (!isValidIban(iban)) { errors.push(`${property?.code ?? p.id}: missing or invalid IBAN`); continue; }
      if (!isValidBic(bic)) { errors.push(`${property?.code ?? p.id}: missing or invalid BIC`); continue; }
      if (!payee) { errors.push(`${property?.code ?? p.id}: missing payee name`); continue; }

      csvRows.push([iban, bic, payee, p.amountDue.toFixed(2), reference].map(csvField).join(','));
    }

    if (errors.length) {
      throw new BadRequestException(`Export blocked — fix these rows first: ${errors.join('; ')}`);
    }

    return ['IBAN,BIC,Payee,Amount,Reference', ...csvRows].join('\n');
  }
}
