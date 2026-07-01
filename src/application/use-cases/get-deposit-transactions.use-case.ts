import { Inject, Injectable } from '@nestjs/common';
import { IDepositTransactionRepository, DEPOSIT_TRANSACTION_REPOSITORY } from '../../domain/deposit-transaction/deposit-transaction.repository';

@Injectable()
export class GetDepositTransactionsUseCase {
  constructor(@Inject(DEPOSIT_TRANSACTION_REPOSITORY) private readonly repo: IDepositTransactionRepository) {}
  async execute(filter?: { propertyId?: string; type?: string; status?: string }) {
    return this.repo.findAll(filter);
  }
}
