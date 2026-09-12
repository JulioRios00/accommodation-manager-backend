import { Inject, Injectable } from '@nestjs/common';
import { IRentPaymentRepository, RENT_PAYMENT_REPOSITORY } from '../../domain/rent-payment/rent-payment.repository';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { deriveDueDate, daysOverdue } from '../../domain/rent-payment/rent-payment.util';

// Mirrors GetDelinquencyReportUseCase's join-in-memory style — this is the "Pending" ledger
// UC-501 asks for: every rent charge not yet fully received, with resident/property context
// and the due-date/overdue arithmetic RentPayment doesn't store directly.
@Injectable()
export class GetReceivablesLedgerUseCase {
  constructor(
    @Inject(RENT_PAYMENT_REPOSITORY) private readonly paymentRepo: IRentPaymentRepository,
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
  ) {}

  async execute() {
    const payments = await this.paymentRepo.findAll();
    const pending = payments.filter((p) => p.paymentStatus !== 'paid');

    return Promise.all(
      pending.map(async (p) => {
        const [resident, property] = await Promise.all([
          this.residentRepo.findById(p.residentId),
          this.propertyRepo.findById(p.propertyId),
        ]);
        const dueDate = deriveDueDate(p.month, p.paymentDueDay);
        return {
          paymentId: p.id,
          bookingId: p.bookingId,
          month: p.month,
          residentId: p.residentId,
          residentName: resident?.fullName ?? 'Unknown',
          residentEmail: resident?.email ?? null,
          propertyCode: property?.code ?? '',
          rentAmount: p.rentAmount,
          amountPaid: p.amountPaid,
          amountDue: Math.round((p.rentAmount - p.amountPaid) * 100) / 100,
          dueDate: dueDate.toISOString().slice(0, 10),
          daysOverdue: daysOverdue(dueDate),
          lateStatus: p.lateStatus,
          d1ReminderSentAt: p.d1ReminderSentAt,
          d4NoticeSentAt: p.d4NoticeSentAt,
        };
      }),
    );
  }
}
