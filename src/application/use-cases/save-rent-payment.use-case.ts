import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';

export interface SaveRentPaymentDto {
  id?: string;
  residentId: string;
  bookingId: string;
  propertyId: string;
  month: string;
  paymentDueDay?: number | null;
  rentAmount: number;
  amountPaid?: number;
  lateStatus?: string;
  notes?: string | null;
}

@Injectable()
export class SaveRentPaymentUseCase {
  constructor(@Inject(RENT_PAYMENT_REPOSITORY) private readonly repo: IRentPaymentRepository) {}

  async execute(dto: SaveRentPaymentDto) {
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`RentPayment ${dto.id} not found`);
    }
    return this.repo.save({ ...dto, amountPaid: dto.amountPaid ?? 0, lateStatus: dto.lateStatus ?? 'on_time' });
  }
}
