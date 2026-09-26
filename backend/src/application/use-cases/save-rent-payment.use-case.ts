import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';
import { derivePaymentStatus } from '../../domain/rent-payment/rent-payment.entity';
import { Actor, AuditLogService } from '../services/audit-log.service';

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
  paymentStatus?: string;
  datePaid?: string | null;
  notes?: string | null;
}

@Injectable()
export class SaveRentPaymentUseCase {
  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly repo: IRentPaymentRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(dto: SaveRentPaymentDto, actor?: Actor) {
    let existing: Awaited<ReturnType<IRentPaymentRepository['findById']>> = null;
    if (dto.id) {
      existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`RentPayment ${dto.id} not found`);
    }
    const amountPaid = dto.amountPaid ?? 0;
    const payment = await this.repo.save({
      ...dto,
      amountPaid,
      lateStatus: dto.lateStatus ?? 'on_time',
      paymentStatus: dto.paymentStatus ?? derivePaymentStatus(amountPaid, dto.rentAmount),
      datePaid: dto.datePaid ? new Date(dto.datePaid) : null,
    } as any);

    await this.auditLog.record({
      actor,
      action: existing ? 'update' : 'create',
      entityType: 'RentPayment',
      entityId: payment.id,
      before: existing as unknown as Record<string, unknown>,
      after: payment as unknown as Record<string, unknown>,
    });

    return payment;
  }
}
