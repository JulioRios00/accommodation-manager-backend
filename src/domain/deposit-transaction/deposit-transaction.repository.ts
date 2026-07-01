import { DepositTransaction } from './deposit-transaction.entity';

export const DEPOSIT_TRANSACTION_REPOSITORY = 'DEPOSIT_TRANSACTION_REPOSITORY';

export interface IDepositTransactionRepository {
  findAll(filter?: { propertyId?: string; type?: string; status?: string }): Promise<DepositTransaction[]>;
  findById(id: string): Promise<DepositTransaction | null>;
  save(tx: Partial<DepositTransaction>): Promise<DepositTransaction>;
  delete(id: string): Promise<void>;
}
