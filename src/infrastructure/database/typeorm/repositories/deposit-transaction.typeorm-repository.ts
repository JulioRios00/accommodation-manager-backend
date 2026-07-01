import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { DepositTransaction } from '../../../../domain/deposit-transaction/deposit-transaction.entity';
import { IDepositTransactionRepository } from '../../../../domain/deposit-transaction/deposit-transaction.repository';
import { DepositTransactionOrmEntity } from '../entities/deposit-transaction.orm-entity';

@Injectable()
export class DepositTransactionTypeOrmRepository implements IDepositTransactionRepository {
  constructor(@InjectRepository(DepositTransactionOrmEntity) private readonly repo: Repository<DepositTransactionOrmEntity>) {}

  async findAll(filter?: { propertyId?: string; type?: string; status?: string }): Promise<DepositTransaction[]> {
    const where: FindOptionsWhere<DepositTransactionOrmEntity> = { active: true };
    if (filter?.propertyId) where.propertyId = filter.propertyId;
    if (filter?.type) where.type = filter.type;
    if (filter?.status) where.status = filter.status;
    return (await this.repo.find({ where, order: { createdAt: 'DESC' } })).map(this.toDomain);
  }

  async findById(id: string): Promise<DepositTransaction | null> {
    const e = await this.repo.findOne({ where: { id, active: true } });
    return e ? this.toDomain(e) : null;
  }

  async save(tx: Partial<DepositTransaction>): Promise<DepositTransaction> {
    const e = this.repo.create(tx as DeepPartial<DepositTransactionOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  private toDomain(e: DepositTransactionOrmEntity): DepositTransaction {
    const d = new DepositTransaction();
    d.id = e.id; d.type = e.type; d.residentId = e.residentId; d.bookingId = e.bookingId ?? null;
    d.propertyId = e.propertyId; d.bedId = e.bedId ?? null; d.residentName = e.residentName;
    d.checkoutDate = e.checkoutDate ?? null; d.depositAmount = Number(e.depositAmount);
    d.proRataRentAmount = e.proRataRentAmount ? Number(e.proRataRentAmount) : null;
    d.iban = e.iban ?? null; d.payeeAddress = e.payeeAddress ?? null; d.status = e.status;
    d.dateProcessed = e.dateProcessed ?? null; d.bankReference = e.bankReference ?? null;
    d.company = e.company ?? null; d.comments = e.comments ?? null; d.active = e.active;
    d.createdAt = e.createdAt; d.updatedAt = e.updatedAt;
    return d;
  }
}
