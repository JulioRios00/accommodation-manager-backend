import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';

@Injectable()
export class DeleteRentPaymentUseCase {
  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly repo: IRentPaymentRepository,
    private readonly auditLog: AuditLogService,
  ) {}
  async execute(id: string, actor?: Actor) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`RentPayment ${id} not found`);
    await this.repo.delete(id);

    await this.auditLog.record({
      actor,
      action: 'delete',
      entityType: 'RentPayment',
      entityId: id,
      before: existing as unknown as Record<string, unknown>,
    });
  }
}
