import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ILandlordPaymentRepository, LANDLORD_PAYMENT_REPOSITORY } from '../../domain/landlord-payment/landlord-payment.repository';

@Injectable()
export class UpdateLandlordPaymentNotesUseCase {
  constructor(@Inject(LANDLORD_PAYMENT_REPOSITORY) private readonly repo: ILandlordPaymentRepository) {}

  async execute(id: string, notes: string | null) {
    const payment = await this.repo.findById(id);
    if (!payment) throw new NotFoundException(`LandlordPayment ${id} not found`);
    return this.repo.save({ ...payment, notes });
  }
}
