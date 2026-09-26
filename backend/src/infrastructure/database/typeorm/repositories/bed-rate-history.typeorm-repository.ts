import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { BedRateHistory } from '../../../../domain/bed-rate-history/bed-rate-history.entity';
import { IBedRateHistoryRepository } from '../../../../domain/bed-rate-history/bed-rate-history.repository';
import { BedRateHistoryOrmEntity } from '../entities/bed-rate-history.orm-entity';

@Injectable()
export class BedRateHistoryTypeOrmRepository implements IBedRateHistoryRepository {
  constructor(@InjectRepository(BedRateHistoryOrmEntity) private readonly repo: Repository<BedRateHistoryOrmEntity>) {}

  async save(entry: Omit<BedRateHistory, 'id' | 'createdAt'>): Promise<BedRateHistory> {
    const e = this.repo.create(entry as DeepPartial<BedRateHistoryOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  async findByBedId(bedId: string): Promise<BedRateHistory[]> {
    const entities = await this.repo.find({ where: { bedId }, order: { effectiveFrom: 'DESC' } });
    return entities.map(this.toDomain);
  }

  async findAsOf(asOf: Date): Promise<BedRateHistory[]> {
    // Latest entry per bed with effectiveFrom <= asOf.
    const rows = await this.repo
      .createQueryBuilder('h')
      .distinctOn(['h.bedId'])
      .where('h.effectiveFrom <= :asOf', { asOf })
      .orderBy('h.bedId')
      .addOrderBy('h.effectiveFrom', 'DESC')
      .getMany();
    return rows.map(this.toDomain);
  }

  private toDomain(e: BedRateHistoryOrmEntity): BedRateHistory {
    const d = new BedRateHistory();
    d.id = e.id;
    d.bedId = e.bedId;
    d.rentAmount = Number(e.rentAmount);
    d.depositAmount = Number(e.depositAmount);
    d.effectiveFrom = e.effectiveFrom;
    d.createdAt = e.createdAt;
    return d;
  }
}
