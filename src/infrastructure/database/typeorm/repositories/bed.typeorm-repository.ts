import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Bed } from '../../../../domain/bed/bed.entity';
import { IBedRepository } from '../../../../domain/bed/bed.repository';
import { BedOrmEntity } from '../entities/bed.orm-entity';

@Injectable()
export class BedTypeOrmRepository implements IBedRepository {
  constructor(
    @InjectRepository(BedOrmEntity)
    private readonly repo: Repository<BedOrmEntity>,
  ) {}

  async findAll(propertyId?: string): Promise<Bed[]> {
    const where = propertyId ? { propertyId, active: true } : { active: true };
    const entities = await this.repo.find({ where, relations: ['property'] });
    return entities.map(this.toDomain);
  }

  async findById(id: string): Promise<Bed | null> {
    const entity = await this.repo.findOne({ where: { id, active: true } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByPropertyAndNumber(propertyId: string, bedNumber: number): Promise<Bed | null> {
    const entity = await this.repo.findOne({ where: { propertyId, bedNumber, active: true } });
    return entity ? this.toDomain(entity) : null;
  }

  async save(bed: Partial<Bed>): Promise<Bed> {
    const entity = this.repo.create(bed as DeepPartial<BedOrmEntity>);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  async deleteByPropertyId(propertyId: string): Promise<void> {
    await this.repo.update({ propertyId }, { active: false });
  }

  async upsertByPropertyAndNumber(bed: Partial<Bed>): Promise<Bed> {
    let entity = await this.repo.findOne({
      where: { propertyId: bed.propertyId, bedNumber: bed.bedNumber },
    });
    if (entity) {
      Object.assign(entity, bed);
    } else {
      entity = this.repo.create(bed as DeepPartial<BedOrmEntity>);
    }
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  private toDomain(entity: BedOrmEntity): Bed {
    const b = new Bed();
    b.id = entity.id;
    b.propertyId = entity.propertyId;
    b.propertyCode = entity.property?.code;
    b.bedNumber = entity.bedNumber;
    b.bedroomType = entity.bedroomType;
    b.sex = entity.sex;
    b.bedSize = entity.bedSize;
    b.depositAmount = Number(entity.depositAmount);
    b.rentAmount = Number(entity.rentAmount);
    b.createdAt = entity.createdAt;
    b.updatedAt = entity.updatedAt;
    return b;
  }
}
