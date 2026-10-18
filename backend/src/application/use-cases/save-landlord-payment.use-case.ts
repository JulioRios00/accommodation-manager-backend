import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsUUID, Matches, MaxLength } from 'class-validator';
import { ILandlordPaymentRepository, LANDLORD_PAYMENT_REPOSITORY } from '../../domain/landlord-payment/landlord-payment.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';

export const LANDLORD_PAYMENT_STATUSES = ['pending', 'paid', 'partial'] as const;

const trimToNull = () => Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value));

/** Validated at the controller with `whitelist: true`, which also strips the server-managed
 *  fields (id in the body, active, createdAt, updatedAt) that the edit dialog echoes back.
 *  The MaxLengths mirror the column widths on landlord_payments, so an over-long value is
 *  reported against its field instead of failing as a bare "value too long" from Postgres. */
export class SaveLandlordPaymentDto {
  @IsOptional() @IsUUID() id?: string;

  @IsUUID() propertyId: string;

  @IsOptional() @IsUUID() landlordId?: string | null;

  /** varchar(7) — 'YYYY-MM'. NOT NULL, so this is deliberately not optional: an empty
   *  month used to reach Postgres as NULL and come back as a generic 400. */
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be in YYYY-MM format' })
  month: string;

  @IsNumber() amountDue: number;

  @IsOptional() @IsNumber() amountPaid?: number;

  @IsOptional() @trimToNull() @IsDateString({}, { message: 'dateDue must be a valid date' })
  dateDue?: string | null;

  @IsOptional() @trimToNull() @IsDateString({}, { message: 'datePaid must be a valid date' })
  datePaid?: string | null;

  @IsOptional() @MaxLength(200) beneficiaryName?: string | null;
  @IsOptional() @MaxLength(50) iban?: string | null;
  @IsOptional() @MaxLength(20) bic?: string | null;
  @IsOptional() @MaxLength(100) paymentReference?: string | null;
  @IsOptional() @MaxLength(50) paymentMethod?: string | null;

  /** Lower-cased on the way in: a stored 'Paid' would silently fail the `status === 'paid'`
   *  checks in mark-landlord-payment-paid and export-landlord-disbursements. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsIn(LANDLORD_PAYMENT_STATUSES)
  status?: string;

  @IsOptional() notes?: string | null;
}

@Injectable()
export class SaveLandlordPaymentUseCase {
  constructor(
    @Inject(LANDLORD_PAYMENT_REPOSITORY) private readonly repo: ILandlordPaymentRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(dto: SaveLandlordPaymentDto, actor?: Actor) {
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`LandlordPayment ${dto.id} not found`);
      // Only the keys actually supplied are passed on. The repository merges onto the loaded
      // row and merge ignores undefined, so an update that omits amountPaid or status leaves
      // them alone rather than resetting them to 0 / 'pending'.
      const updated = await this.repo.save(dto as any);

      // This path can set status/amountPaid/datePaid by hand, bypassing the audit-logged
      // mark-paid action. Until that gap is closed, at least record who changed what —
      // AuditLogService diffs the fields and drops no-op saves on its own.
      await this.auditLog.record({
        actor,
        action: 'update',
        entityType: 'LandlordPayment',
        entityId: updated.id,
        before: existing as unknown as Record<string, unknown>,
        after: updated as unknown as Record<string, unknown>,
      });

      return updated;
    }

    const created = await this.repo.save({
      ...dto,
      amountPaid: dto.amountPaid ?? 0,
      status: dto.status ?? 'pending',
    } as any);

    await this.auditLog.record({
      actor,
      action: 'create',
      entityType: 'LandlordPayment',
      entityId: created.id,
      after: created as unknown as Record<string, unknown>,
    });

    return created;
  }
}
