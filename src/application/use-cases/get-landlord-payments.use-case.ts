import { Inject, Injectable } from '@nestjs/common';
import { ILandlordPaymentRepository, LANDLORD_PAYMENT_REPOSITORY } from '../../domain/landlord-payment/landlord-payment.repository';

@Injectable()
export class GetLandlordPaymentsUseCase {
  constructor(@Inject(LANDLORD_PAYMENT_REPOSITORY) private readonly repo: ILandlordPaymentRepository) {}
  async execute(filter?: { propertyId?: string; landlordId?: string; month?: string }) {
    return this.repo.findAll(filter);
  }
}
