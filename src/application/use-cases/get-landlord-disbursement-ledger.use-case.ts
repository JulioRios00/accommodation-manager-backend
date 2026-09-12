import { Inject, Injectable } from '@nestjs/common';
import { ILandlordPaymentRepository, LANDLORD_PAYMENT_REPOSITORY } from '../../domain/landlord-payment/landlord-payment.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { ILandlordRepository, LANDLORD_REPOSITORY } from '../../domain/landlord/landlord.repository';
import { paymentDescription } from '../../domain/landlord-payment/payment-description.util';

// No fee model exists in SAMS today (confirmed) — net amount to pay the landlord is the gross
// rent LandlordPayment.amountDue already represents, unchanged. Revisit if a real commission
// model is introduced later.
@Injectable()
export class GetLandlordDisbursementLedgerUseCase {
  constructor(
    @Inject(LANDLORD_PAYMENT_REPOSITORY) private readonly paymentRepo: ILandlordPaymentRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(LANDLORD_REPOSITORY) private readonly landlordRepo: ILandlordRepository,
  ) {}

  async execute() {
    const payments = await this.paymentRepo.findAll();

    return Promise.all(
      payments.map(async (p) => {
        const [property, landlord] = await Promise.all([
          this.propertyRepo.findById(p.propertyId),
          p.landlordId ? this.landlordRepo.findById(p.landlordId) : Promise.resolve(null),
        ]);

        return {
          paymentId: p.id,
          propertyId: p.propertyId,
          propertyCode: property?.code ?? '',
          month: p.month,
          dateDue: p.dateDue,
          datePaid: p.datePaid,
          netAmount: p.amountDue,
          // The payment's own snapshot fields win (e.g. set at generation time); fall back to
          // the landlord's current bank details when the row hasn't captured them yet.
          beneficiaryName: p.beneficiaryName || landlord?.name || null,
          iban: p.iban || landlord?.iban || null,
          bic: p.bic || landlord?.bic || null,
          paymentDescription: p.paymentReference || paymentDescription(p.month, property?.code ?? ''),
          notes: p.notes,
          status: p.status,
        };
      }),
    );
  }
}
