import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IRentPaymentRepository,
  RENT_PAYMENT_REPOSITORY,
  IRentPaymentInstallmentRepository,
  RENT_PAYMENT_INSTALLMENT_REPOSITORY,
} from '../../domain/rent-payment/rent-payment.repository';

/** The part-payment history behind a rent payment's amountPaid. Installments were already
 *  being written by AddRentInstallmentUseCase but there was no way to read them back, so
 *  the history existed in the database and nowhere else. */
@Injectable()
export class GetRentInstallmentsUseCase {
  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly paymentRepo: IRentPaymentRepository,
    @Inject(RENT_PAYMENT_INSTALLMENT_REPOSITORY)
    private readonly installmentRepo: IRentPaymentInstallmentRepository,
  ) {}

  async execute(rentPaymentId: string) {
    const payment = await this.paymentRepo.findById(rentPaymentId);
    if (!payment) throw new NotFoundException(`RentPayment ${rentPaymentId} not found`);

    const installments = await this.installmentRepo.findByPayment(rentPaymentId);
    // Oldest first — this is read as a running history of how the balance was settled.
    return [...installments].sort(
      (a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime(),
    );
  }
}
