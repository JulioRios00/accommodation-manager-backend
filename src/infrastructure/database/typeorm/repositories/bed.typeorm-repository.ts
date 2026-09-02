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
    const entities = await this.repo.find({ where, relations: ['property', 'bedroom'] });
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
    // Bed number alone is only unique property-wide for the older numbering convention.
    // Under the letter-first convention (A1, B1, ...) it resets per bedroom, so two
    // different beds can share the same number — disambiguate by bedroom when we have one,
    // instead of overwriting whichever bed the number matched first.
    let entity = await this.repo.findOne({
      where: bed.bedroomId
        ? { propertyId: bed.propertyId, bedroomId: bed.bedroomId, bedNumber: bed.bedNumber }
        : { propertyId: bed.propertyId, bedNumber: bed.bedNumber },
    });
    if (entity) {
      // Mirrors PropertyTypeOrmRepository.upsertByCode: reactivate a soft-deleted bed
      // instead of leaving it hidden behind an updated-but-inactive row.
      // Historical rows (e.g. the CheckedOut sheet) use the old digit-only bed numbering
      // with no letter, so they carry bedroomId: null — don't let that null out a bedroom
      // assignment a more informative row (Control sheet) already made for this bed.
      const bedroomId = bed.bedroomId ?? entity.bedroomId;
      Object.assign(entity, bed, { bedroomId, active: true });
    } else {
      entity = this.repo.create({ ...bed, active: true } as DeepPartial<BedOrmEntity>);
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
    b.bedroomId = entity.bedroomId ?? null;
    b.bedroomName = entity.bedroom?.name ?? null;
    b.name = entity.name ?? null;
    b.position = entity.position ?? null;
    b.status = (entity.status ?? 'vacant') as any;
    b.bedroomType = entity.bedroomType;
    b.sex = entity.sex;
    b.bedSize = entity.bedSize;
    b.depositAmount = Number(entity.depositAmount);
    b.rentAmount = Number(entity.rentAmount);
    b.active = entity.active;
    b.createdAt = entity.createdAt;
    b.updatedAt = entity.updatedAt;
    return b;
  }
}
