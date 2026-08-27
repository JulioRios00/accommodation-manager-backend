import { Inject, Injectable } from '@nestjs/common';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';

export interface DelinquencyFilter {
  propertyId?: string;
  month?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class GetDelinquencyReportUseCase {
  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly paymentRepo: IRentPaymentRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
  ) {}

  async execute(filter?: DelinquencyFilter) {
    // The UI's "Property ID" search field is the only property identifier users can see
    // (the human-readable code, e.g. "33HBH") — resolve it to the internal UUID that
    // rent_payments.propertyId actually stores before filtering.
    let resolvedFilter = filter;
    if (filter?.propertyId) {
      const byCode = await this.propertyRepo.findByCode(filter.propertyId.trim());
      if (!byCode && !UUID_RE.test(filter.propertyId)) return []; // no such code, and not a raw UUID either — clean empty state
      resolvedFilter = { ...filter, propertyId: byCode ? byCode.id : filter.propertyId };
    }

    const payments = await this.paymentRepo.findAll(resolvedFilter);
    const outstanding = payments.filter(p => p.amountPaid < p.rentAmount);

    return Promise.all(outstanding.map(async p => {
      const resident = await this.residentRepo.findById(p.residentId);
      const property = await this.propertyRepo.findById(p.propertyId);
      return {
        paymentId: p.id,
        month: p.month,
        residentId: p.residentId,
        residentName: resident?.fullName ?? 'Unknown',
        delinquent: resident?.delinquent ?? false,
        propertyCode: property?.code ?? '',
        fullAddress: property?.fullAddress ?? '',
        rentAmount: p.rentAmount,
        amountPaid: p.amountPaid,
        amountDue: p.rentAmount - p.amountPaid,
        lateStatus: p.lateStatus,
      };
    }));
  }
}
