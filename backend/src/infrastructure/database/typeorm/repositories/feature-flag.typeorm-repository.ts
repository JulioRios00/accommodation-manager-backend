import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag, FeatureFlagKey } from '../../../../domain/feature-flag/feature-flag.entity';
import { IFeatureFlagRepository } from '../../../../domain/feature-flag/feature-flag.repository';
import { FeatureFlagOrmEntity } from '../entities/feature-flag.orm-entity';

@Injectable()
export class FeatureFlagTypeOrmRepository implements IFeatureFlagRepository {
  constructor(@InjectRepository(FeatureFlagOrmEntity) private readonly repo: Repository<FeatureFlagOrmEntity>) {}

  async findAll(): Promise<FeatureFlag[]> {
    return (await this.repo.find()).map(this.toDomain);
  }

  async findByKey(key: FeatureFlagKey): Promise<FeatureFlag | null> {
    const e = await this.repo.findOne({ where: { key } });
    return e ? this.toDomain(e) : null;
  }

  async setEnabled(key: FeatureFlagKey, enabled: boolean): Promise<FeatureFlag> {
    const existing = await this.repo.findOne({ where: { key } });
    const e = this.repo.create({ ...existing, key, enabled });
    return this.toDomain(await this.repo.save(e));
  }

  private toDomain(e: FeatureFlagOrmEntity): FeatureFlag {
    const d = new FeatureFlag();
    d.key = e.key as FeatureFlagKey;
    d.enabled = e.enabled;
    d.updatedAt = e.updatedAt;
    return d;
  }
}
