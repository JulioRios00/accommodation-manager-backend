import { Inject, Injectable } from '@nestjs/common';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';

@Injectable()
export class GetRentPaymentsUseCase {
  constructor(@Inject(RENT_PAYMENT_REPOSITORY) private readonly repo: IRentPaymentRepository) {}
  async execute(filter?: { propertyId?: string; month?: string; residentId?: string }) {
    return this.repo.findAll(filter);
  }
}
