import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IDepositTransactionRepository, DEPOSIT_TRANSACTION_REPOSITORY } from '../../domain/deposit-transaction/deposit-transaction.repository';

@Injectable()
export class DeleteDepositTransactionUseCase {
  constructor(@Inject(DEPOSIT_TRANSACTION_REPOSITORY) private readonly repo: IDepositTransactionRepository) {}
  async execute(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`DepositTransaction ${id} not found`);
    await this.repo.delete(id);
  }
}
