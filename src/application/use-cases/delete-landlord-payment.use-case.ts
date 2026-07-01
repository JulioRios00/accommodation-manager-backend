import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ILandlordPaymentRepository, LANDLORD_PAYMENT_REPOSITORY } from '../../domain/landlord-payment/landlord-payment.repository';

@Injectable()
export class DeleteLandlordPaymentUseCase {
  constructor(@Inject(LANDLORD_PAYMENT_REPOSITORY) private readonly repo: ILandlordPaymentRepository) {}
  async execute(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`LandlordPayment ${id} not found`);
    await this.repo.delete(id);
  }
}
