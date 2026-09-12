import { Inject, Injectable } from '@nestjs/common';
import { IDepositTransactionRepository, DEPOSIT_TRANSACTION_REPOSITORY } from '../../domain/deposit-transaction/deposit-transaction.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { businessDaysRemaining } from '../../domain/shared/business-day.util';

// The "Finance queue" UC-601 asks for — DepositTransaction already models it
// (type:'refund', status:'pending'), created automatically by CheckoutUseCase.
@Injectable()
export class GetDepositRefundQueueUseCase {
  constructor(
    @Inject(DEPOSIT_TRANSACTION_REPOSITORY) private readonly depositRepo: IDepositTransactionRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
  ) {}

  async execute() {
    const items = await this.depositRepo.findAll({ type: 'refund', status: 'pending' });

    const rows = await Promise.all(
      items.map(async (item) => {
        const [property, bed] = await Promise.all([
          this.propertyRepo.findById(item.propertyId),
          item.bedId ? this.bedRepo.findById(item.bedId) : Promise.resolve(null),
        ]);
        return {
          depositTransactionId: item.id,
          residentId: item.residentId,
          residentName: item.residentName,
          propertyCode: property?.code ?? '',
          bedNumber: bed?.bedNumber ?? null,
          depositAmount: item.depositAmount,
          checkoutDate: item.checkoutDate,
          refundDueDate: item.refundDueDate,
          // TypeORM returns 'date' columns as raw "YYYY-MM-DD" strings, not Date objects —
          // wrap explicitly rather than relying on the repository/ORM layer to have done it.
          businessDaysRemaining: item.refundDueDate ? businessDaysRemaining(new Date(item.refundDueDate)) : null,
          iban: item.iban,
        };
      }),
    );

    // Most urgent first — overdue/soonest deadlines surface at the top. Items with no
    // deadline (pre-UC-601 legacy rows) sort last rather than crowding the top.
    return rows.sort((a, b) => {
      if (a.refundDueDate === null) return 1;
      if (b.refundDueDate === null) return -1;
      return new Date(a.refundDueDate).getTime() - new Date(b.refundDueDate).getTime();
    });
  }
}
