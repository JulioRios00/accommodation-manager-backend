import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import {
  IRentPaymentRepository,
  RENT_PAYMENT_REPOSITORY,
  IRentPaymentInstallmentRepository,
  RENT_PAYMENT_INSTALLMENT_REPOSITORY,
} from '../../domain/rent-payment/rent-payment.repository';
import { derivePaymentStatus } from '../../domain/rent-payment/rent-payment.entity';
import { Actor, AuditLogService } from '../services/audit-log.service';

export class AddRentInstallmentDto {
  /** Taken from the route, not the body — whitelisted away if a caller sends one. */
  rentPaymentId: string;

  /** @Type matters as much as the validator here: this value is *added* to the running
   *  amountPaid, so an un-coerced JSON string would concatenate ("100" + 50 = "10050")
   *  rather than sum. A part payment of zero or less is not a payment. */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'amount must be greater than zero' })
  amount: number;

  @IsDateString({}, { message: 'paidAt must be a valid date' })
  paidAt: string;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string | null;
}

@Injectable()
export class AddRentInstallmentUseCase {
  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY)
    private readonly paymentRepo: IRentPaymentRepository,
    @Inject(RENT_PAYMENT_INSTALLMENT_REPOSITORY)
    private readonly installmentRepo: IRentPaymentInstallmentRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(dto: AddRentInstallmentDto, actor?: Actor) {
    const payment = await this.paymentRepo.findById(dto.rentPaymentId);
    if (!payment)
      throw new NotFoundException(`RentPayment ${dto.rentPaymentId} not found`);

    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a number greater than zero');
    }

    const installment = await this.installmentRepo.save({ ...dto, amount } as any);
    // Accumulates rather than replaces — that is the whole point of recording part
    // payments separately instead of overwriting amountPaid each time.
    const newAmountPaid = Number(payment.amountPaid) + amount;
    const updated = await this.paymentRepo.save({
      ...payment,
      amountPaid: newAmountPaid,
      paymentStatus: derivePaymentStatus(newAmountPaid, payment.rentAmount),
    });

    // This path moves money on the record without going through the normal save, so it
    // needs the same attribution as an edit does.
    await this.auditLog.record({
      actor,
      action: 'update',
      entityType: 'RentPayment',
      entityId: payment.id,
      before: payment as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return installment;
  }
}
