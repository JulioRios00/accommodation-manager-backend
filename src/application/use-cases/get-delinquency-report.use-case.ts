import { Inject, Injectable } from '@nestjs/common';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';

export interface DelinquencyFilter {
  propertyId?: string;
  month?: string;
}

@Injectable()
export class GetDelinquencyReportUseCase {
  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly paymentRepo: IRentPaymentRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
  ) {}

  async execute(filter?: DelinquencyFilter) {
    const payments = await this.paymentRepo.findAll(filter);
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
