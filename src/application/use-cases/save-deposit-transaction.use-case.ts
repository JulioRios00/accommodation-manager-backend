import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IDepositTransactionRepository, DEPOSIT_TRANSACTION_REPOSITORY } from '../../domain/deposit-transaction/deposit-transaction.repository';

export interface SaveDepositTransactionDto {
  id?: string;
  type: string;
  residentId: string;
  bookingId?: string | null;
  propertyId: string;
  bedId?: string | null;
  residentName: string;
  checkoutDate?: string | null;
  depositAmount: number;
  proRataRentAmount?: number | null;
  iban?: string | null;
  payeeAddress?: string | null;
  status?: string;
  dateProcessed?: string | null;
  bankReference?: string | null;
  company?: string | null;
  comments?: string | null;
}

@Injectable()
export class SaveDepositTransactionUseCase {
  constructor(@Inject(DEPOSIT_TRANSACTION_REPOSITORY) private readonly repo: IDepositTransactionRepository) {}

  async execute(dto: SaveDepositTransactionDto) {
    if (dto.id) {
      const existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`DepositTransaction ${dto.id} not found`);
    }
    return this.repo.save({ ...dto, status: dto.status ?? 'pending' } as any);
  }
}
