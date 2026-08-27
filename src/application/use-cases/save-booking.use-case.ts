import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Booking, BookingStatus } from '../../domain/booking/booking.entity';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';
import { IBedRateHistoryRepository, BED_RATE_HISTORY_REPOSITORY } from '../../domain/bed-rate-history/bed-rate-history.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';

/**
 * `payment` — only the next not-yet-paid RentPayment for this booking gets the new amount;
 *   the Booking's own rent/deposit stays at its previous value.
 * `period`  — the Booking's rent/deposit changes, and every not-yet-paid RentPayment tied to
 *   it is updated to match.
 * `bed`     — same as `period`, plus the Bed's own default rent/deposit is updated too, so
 *   future bookings on that bed start from the new price.
 */
export type RentChangeScope = 'payment' | 'period' | 'bed';

export interface SaveBookingDto {
  id?: string;
  bedId: string;
  residentId: string;
  checkInDate?: string | null;
  contractEndDate?: string | null;
  checkOutDate?: string | null;
  depositAmount?: number;
  rentAmount?: number;
  isHeadResident?: boolean;
  isTemporary?: boolean;
  status: BookingStatus;
  comments?: string | null;
  /** How a rent/deposit change should propagate. Ignored unless rentAmount/depositAmount
   *  actually differ from the existing booking's values. Defaults to `period`. */
  rentChangeScope?: RentChangeScope;
}

@Injectable()
export class SaveBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly repo: IBookingRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly rentPaymentRepo: IRentPaymentRepository,
    @Inject(BED_RATE_HISTORY_REPOSITORY) private readonly rateHistoryRepo: IBedRateHistoryRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(dto: SaveBookingDto, actor?: Actor): Promise<Booking> {
    const bed = await this.bedRepo.findById(dto.bedId);
    if (!bed) throw new NotFoundException(`Bed ${dto.bedId} not found`);

    const resident = await this.residentRepo.findById(dto.residentId);
    if (!resident) throw new NotFoundException(`Resident ${dto.residentId} not found`);

    const startDate = dto.checkInDate ? new Date(dto.checkInDate) : null;
    const endDate = dto.contractEndDate
      ? new Date(dto.contractEndDate)
      : dto.checkOutDate
        ? new Date(dto.checkOutDate)
        : null;

    if (startDate && endDate && startDate >= endDate) {
      throw new BadRequestException('Licence start date must be before end date');
    }

    // A resident can hold more than one active booking (e.g. current one ending this month,
    // next one already signed for a different property) as long as the date ranges don't
    // overlap. Without dates on both sides we can't prove they don't overlap, so play safe.
    if (dto.status === 'active') {
      const activeBookings = await this.repo.findAllActiveByResidentId(dto.residentId);
      const FAR_FUTURE = new Date(8640000000000000);
      const conflicting = activeBookings.find(b => {
        if (b.id === dto.id) return false;
        const bStart = b.checkInDate ? new Date(b.checkInDate) : null;
        const bEnd = b.contractEndDate ? new Date(b.contractEndDate) : b.checkOutDate ? new Date(b.checkOutDate) : null;
        if (!startDate || !bStart) return true;
        return startDate < (bEnd ?? FAR_FUTURE) && bStart < (endDate ?? FAR_FUTURE);
      });
      if (conflicting) {
        throw new BadRequestException(
          `Resident already has an overlapping active booking (booking ${conflicting.id}) — active bookings for the same resident must not overlap in dates`,
        );
      }
    }

    if (startDate && endDate) {
      const overlapping = await this.repo.findOverlappingActive(dto.bedId, startDate, endDate, dto.id);
      if (overlapping.length > 0) {
        throw new BadRequestException(
          `Bed is already allocated during the selected period (conflicts with booking ${overlapping[0].id})`,
        );
      }
    }

    let existing: Booking | null = null;
    if (dto.id) {
      existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`Booking ${dto.id} not found`);
    }

    // The Booking's own value overrides the Bed's default rent/deposit wherever it's used
    // downstream; when the caller doesn't supply one at all, fall back to the Bed's current
    // value instead of silently persisting 0.
    const newRentAmount = dto.rentAmount ?? bed.rentAmount;
    const newDepositAmount = dto.depositAmount ?? bed.depositAmount;
    const scope: RentChangeScope = dto.rentChangeScope ?? 'period';
    const rentChanged = !!existing && (newRentAmount !== existing.rentAmount || newDepositAmount !== existing.depositAmount);

    // "Just this payment" keeps the booking's own rent/deposit as they were — only the
    // targeted RentPayment record below gets the new amount.
    const bookingRentAmount = rentChanged && scope === 'payment' ? existing!.rentAmount : newRentAmount;
    const bookingDepositAmount = rentChanged && scope === 'payment' ? existing!.depositAmount : newDepositAmount;

    const booking = await this.repo.save({
      ...dto,
      rentAmount: bookingRentAmount,
      depositAmount: bookingDepositAmount,
      checkInDate: dto.checkInDate ? new Date(dto.checkInDate) : null,
      contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : null,
      checkOutDate: dto.checkOutDate ? new Date(dto.checkOutDate) : null,
    });

    if (booking.status === 'active') {
      await this.bedRepo.save({ id: dto.bedId, status: 'allocated' });
    }

    if (rentChanged) {
      const paymentsForBooking = await this.rentPaymentRepo.findAll({ bookingId: booking.id });
      const unpaid = paymentsForBooking.filter(p => p.paymentStatus !== 'paid').sort((a, b) => a.month.localeCompare(b.month));

      if (scope === 'payment') {
        const next = unpaid[0];
        if (next) await this.rentPaymentRepo.save({ id: next.id, rentAmount: newRentAmount });
      } else {
        for (const payment of unpaid) {
          await this.rentPaymentRepo.save({ id: payment.id, rentAmount: newRentAmount });
        }
        if (scope === 'bed') {
          await this.bedRepo.save({ id: bed.id, rentAmount: newRentAmount, depositAmount: newDepositAmount });
          await this.rateHistoryRepo.save({
            bedId: bed.id,
            rentAmount: newRentAmount,
            depositAmount: newDepositAmount,
            effectiveFrom: new Date(),
          });
        }
      }
    }

    await this.auditLog.record({
      actor,
      action: existing ? 'update' : 'create',
      entityType: 'Booking',
      entityId: booking.id,
      before: existing as unknown as Record<string, unknown>,
      after: booking as unknown as Record<string, unknown>,
    });

    return booking;
  }
}
