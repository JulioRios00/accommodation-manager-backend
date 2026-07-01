import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { ICheckoutRecordRepository, CHECKOUT_RECORD_REPOSITORY } from '../../domain/checkout-record/checkout-record.repository';
import { IDepositTransactionRepository, DEPOSIT_TRANSACTION_REPOSITORY } from '../../domain/deposit-transaction/deposit-transaction.repository';

export interface CheckoutDto {
  bookingId: string;
  checkoutDate: string;
  keysReturned?: boolean;
  inspectionNotes?: string | null;
  depositRefundAmount?: number | null;
  refundIban?: string | null;
  proRataRentAmount?: number | null;
  proRataAdjustment?: number | null;
  newResidentLinked?: boolean;
  newResidentId?: string | null;
  processedBy?: string | null;
  processedByName?: string | null;
  notes?: string | null;
  residentName?: string;
  propertyId?: string;
  bedId?: string | null;
  residentId?: string;
  company?: string | null;
  comments?: string | null;
}

@Injectable()
export class CheckoutUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(CHECKOUT_RECORD_REPOSITORY) private readonly checkoutRepo: ICheckoutRecordRepository,
    @Inject(DEPOSIT_TRANSACTION_REPOSITORY) private readonly depositRepo: IDepositTransactionRepository,
  ) {}

  async execute(dto: CheckoutDto) {
    const booking = await this.bookingRepo.findById(dto.bookingId);
    if (!booking) throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    if (booking.status === 'completed') throw new BadRequestException('Booking is already completed');

    await this.bookingRepo.save({ ...booking, status: 'completed', checkOutDate: new Date(dto.checkoutDate) });

    const record = await this.checkoutRepo.save({
      bookingId: dto.bookingId,
      checkoutDate: new Date(dto.checkoutDate),
      keysReturned: dto.keysReturned ?? false,
      inspectionNotes: dto.inspectionNotes,
      depositRefundAmount: dto.depositRefundAmount,
      refundIban: dto.refundIban,
      proRataRentAmount: dto.proRataRentAmount,
      proRataAdjustment: dto.proRataAdjustment,
      newResidentLinked: dto.newResidentLinked ?? false,
      newResidentId: dto.newResidentId,
      processedBy: dto.processedBy,
      processedByName: dto.processedByName,
      notes: dto.notes,
    });

    if (dto.depositRefundAmount && dto.residentId && dto.propertyId) {
      await this.depositRepo.save({
        type: 'refund',
        residentId: dto.residentId,
        bookingId: dto.bookingId,
        propertyId: dto.propertyId,
        bedId: dto.bedId ?? null,
        residentName: dto.residentName ?? '',
        checkoutDate: new Date(dto.checkoutDate),
        depositAmount: dto.depositRefundAmount,
        proRataRentAmount: dto.proRataRentAmount ?? null,
        iban: dto.refundIban ?? null,
        company: dto.company ?? null,
        comments: dto.comments ?? null,
        status: 'pending',
      });
    }

    return record;
  }
}
