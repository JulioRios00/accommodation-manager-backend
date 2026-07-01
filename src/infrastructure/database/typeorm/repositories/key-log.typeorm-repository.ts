import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { KeyLog } from '../../../../domain/key-log/key-log.entity';
import { IKeyLogRepository } from '../../../../domain/key-log/key-log.repository';
import { KeyLogOrmEntity } from '../entities/key-log.orm-entity';

@Injectable()
export class KeyLogTypeOrmRepository implements IKeyLogRepository {
  constructor(@InjectRepository(KeyLogOrmEntity) private readonly repo: Repository<KeyLogOrmEntity>) {}

  async findAll(propertyId?: string): Promise<KeyLog[]> {
    const where: any = { active: true };
    if (propertyId) where.propertyId = propertyId;
    return (await this.repo.find({ where, order: { takenAt: 'DESC' } })).map(this.toDomain);
  }

  async findById(id: string): Promise<KeyLog | null> {
    const e = await this.repo.findOne({ where: { id, active: true } });
    return e ? this.toDomain(e) : null;
  }

  async save(log: Partial<KeyLog>): Promise<KeyLog> {
    const e = this.repo.create(log as DeepPartial<KeyLogOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  private toDomain(e: KeyLogOrmEntity): KeyLog {
    const d = new KeyLog();
    d.id = e.id; d.propertyId = e.propertyId; d.bedId = e.bedId ?? null;
    d.keyType = e.keyType; d.takenBy = e.takenBy; d.takenByType = e.takenByType;
    d.takenAt = e.takenAt; d.expectedReturnAt = e.expectedReturnAt ?? null;
    d.actualReturnAt = e.actualReturnAt ?? null; d.returnStatus = e.returnStatus;
    d.notes = e.notes ?? null; d.active = e.active;
    d.createdAt = e.createdAt; d.updatedAt = e.updatedAt;
    return d;
  }
}
