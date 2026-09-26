import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IRentPaymentRepository, IRentPaymentInstallmentRepository,
  RENT_PAYMENT_REPOSITORY, RENT_PAYMENT_INSTALLMENT_REPOSITORY,
} from '../../domain/rent-payment/rent-payment.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';

@Injectable()
export class MarkRentPaymentReceivedUseCase {
  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly paymentRepo: IRentPaymentRepository,
    @Inject(RENT_PAYMENT_INSTALLMENT_REPOSITORY) private readonly installmentRepo: IRentPaymentInstallmentRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(rentPaymentId: string, actor?: Actor) {
    const payment = await this.paymentRepo.findById(rentPaymentId);
    if (!payment) throw new NotFoundException(`RentPayment ${rentPaymentId} not found`);

    // Idempotent by design: re-calling on an already-received invoice is a clear error, not a
    // silent no-op or a double-counted installment.
    if (payment.paymentStatus === 'paid') {
      throw new ConflictException(`RentPayment ${rentPaymentId} is already received`);
    }

    const gap = Math.round((payment.rentAmount - payment.amountPaid) * 100) / 100;
    if (gap > 0) {
      await this.installmentRepo.save({
        rentPaymentId,
        amount: gap,
        paidAt: new Date(),
        notes: 'Marked as received via bank reconciliation',
      });
    }

    const updated = await this.paymentRepo.save({
      ...payment,
      amountPaid: payment.rentAmount,
      paymentStatus: 'paid',
      datePaid: new Date(),
      lateStatus: 'on_time',
    });

    await this.auditLog.record({
      actor,
      action: 'update',
      entityType: 'RentPayment',
      entityId: payment.id,
      before: payment as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }
}
