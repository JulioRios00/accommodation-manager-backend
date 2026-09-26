import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ILandlordPaymentRepository, LANDLORD_PAYMENT_REPOSITORY } from '../../domain/landlord-payment/landlord-payment.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';

@Injectable()
export class MarkLandlordPaymentPaidUseCase {
  constructor(
    @Inject(LANDLORD_PAYMENT_REPOSITORY) private readonly repo: ILandlordPaymentRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(id: string, actor?: Actor) {
    const payment = await this.repo.findById(id);
    if (!payment) throw new NotFoundException(`LandlordPayment ${id} not found`);
    if (payment.status === 'paid') {
      throw new ConflictException(`LandlordPayment ${id} is already paid`);
    }

    // Server time, never client-supplied — this timestamp has to be trustworthy since it's the
    // record of when a real bank disbursement was executed.
    const updated = await this.repo.save({
      ...payment,
      status: 'paid',
      amountPaid: payment.amountDue,
      datePaid: new Date(),
    });

    await this.auditLog.record({
      actor,
      action: 'update',
      entityType: 'LandlordPayment',
      entityId: payment.id,
      before: payment as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }
}
