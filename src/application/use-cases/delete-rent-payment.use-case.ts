import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';

@Injectable()
export class DeleteRentPaymentUseCase {
  constructor(@Inject(RENT_PAYMENT_REPOSITORY) private readonly repo: IRentPaymentRepository) {}
  async execute(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`RentPayment ${id} not found`);
    await this.repo.delete(id);
  }
}
