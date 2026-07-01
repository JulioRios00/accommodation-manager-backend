import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY, IRentPaymentInstallmentRepository, RENT_PAYMENT_INSTALLMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';

export interface AddRentInstallmentDto {
  rentPaymentId: string;
  amount: number;
  paidAt: string;
  notes?: string | null;
}

@Injectable()
export class AddRentInstallmentUseCase {
  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly paymentRepo: IRentPaymentRepository,
    @Inject(RENT_PAYMENT_INSTALLMENT_REPOSITORY) private readonly installmentRepo: IRentPaymentInstallmentRepository,
  ) {}

  async execute(dto: AddRentInstallmentDto) {
    const payment = await this.paymentRepo.findById(dto.rentPaymentId);
    if (!payment) throw new NotFoundException(`RentPayment ${dto.rentPaymentId} not found`);

    const installment = await this.installmentRepo.save(dto as any);
    const newAmountPaid = payment.amountPaid + dto.amount;
    await this.paymentRepo.save({ ...payment, amountPaid: newAmountPaid });
    return installment;
  }
}
