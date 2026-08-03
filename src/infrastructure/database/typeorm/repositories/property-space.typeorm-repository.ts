import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { PropertySpace, SpaceItem } from '../../../../domain/property-space/property-space.entity';
import {
  IPropertySpaceRepository, ISpaceItemRepository,
} from '../../../../domain/property-space/property-space.repository';
import { PropertySpaceOrmEntity } from '../entities/property-space.orm-entity';
import { SpaceItemOrmEntity } from '../entities/space-item.orm-entity';

@Injectable()
export class PropertySpaceTypeOrmRepository implements IPropertySpaceRepository {
  constructor(
    @InjectRepository(PropertySpaceOrmEntity)
    private readonly repo: Repository<PropertySpaceOrmEntity>,
  ) {}

  async findAll(propertyId?: string): Promise<PropertySpace[]> {
    const where = propertyId ? { propertyId, active: true } : { active: true };
    const entities = await this.repo.find({
      where,
      relations: ['items'],
      order: { category: 'ASC', name: 'ASC' },
    });
    return entities.map(this.toDomain);
  }

  async findById(id: string): Promise<PropertySpace | null> {
    const e = await this.repo.findOne({ where: { id, active: true }, relations: ['items'] });
    return e ? this.toDomain(e) : null;
  }

  async save(space: Partial<PropertySpace>): Promise<PropertySpace> {
    const e = this.repo.create(space as DeepPartial<PropertySpaceOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  private toDomain(e: PropertySpaceOrmEntity): PropertySpace {
    const d = new PropertySpace();
    d.id = e.id;
    d.propertyId = e.propertyId;
    d.category = e.category as any;
    d.name = e.name;
    d.active = e.active;
    d.createdAt = e.createdAt;
    d.updatedAt = e.updatedAt;
    if (e.items) {
      d.items = e.items.filter(i => i.active).map(i => {
        const item = new SpaceItem();
        item.id = i.id;
        item.spaceId = i.spaceId;
        item.name = i.name;
        item.quantity = i.quantity;
        item.condition = i.condition ?? null;
        item.notes = i.notes ?? null;
        item.active = i.active;
        item.createdAt = i.createdAt;
        item.updatedAt = i.updatedAt;
        return item;
      });
    }
    return d;
  }
}

@Injectable()
export class SpaceItemTypeOrmRepository implements ISpaceItemRepository {
  constructor(
    @InjectRepository(SpaceItemOrmEntity)
    private readonly repo: Repository<SpaceItemOrmEntity>,
  ) {}

  async findBySpaceId(spaceId: string): Promise<SpaceItem[]> {
    const entities = await this.repo.find({ where: { spaceId, active: true } });
    return entities.map(this.toDomain);
  }

  async findById(id: string): Promise<SpaceItem | null> {
    const e = await this.repo.findOne({ where: { id, active: true } });
    return e ? this.toDomain(e) : null;
  }

  async save(item: Partial<SpaceItem>): Promise<SpaceItem> {
    const e = this.repo.create(item as DeepPartial<SpaceItemOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  async deleteBySpaceId(spaceId: string): Promise<void> {
    await this.repo.update({ spaceId }, { active: false });
  }

  private toDomain(e: SpaceItemOrmEntity): SpaceItem {
    const d = new SpaceItem();
    d.id = e.id;
    d.spaceId = e.spaceId;
    d.name = e.name;
    d.quantity = e.quantity ?? 1;
    d.condition = e.condition ?? null;
    d.notes = e.notes ?? null;
    d.active = e.active;
    d.createdAt = e.createdAt;
    d.updatedAt = e.updatedAt;
    return d;
  }
}
