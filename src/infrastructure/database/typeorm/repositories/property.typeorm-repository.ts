import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Property } from '../../../../domain/property/property.entity';
import { IPropertyRepository } from '../../../../domain/property/property.repository';
import { PropertyOrmEntity } from '../entities/property.orm-entity';

@Injectable()
export class PropertyTypeOrmRepository implements IPropertyRepository {
  constructor(
    @InjectRepository(PropertyOrmEntity)
    private readonly repo: Repository<PropertyOrmEntity>,
  ) {}

  async findAll(): Promise<Property[]> {
    const entities = await this.repo.find({ where: { active: true }, relations: ['beds'] });
    return entities.map(this.toDomain);
  }

  async findById(id: string): Promise<Property | null> {
    const entity = await this.repo.findOne({ where: { id, active: true } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByCode(code: string): Promise<Property | null> {
    const entity = await this.repo.findOne({ where: { code, active: true } });
    return entity ? this.toDomain(entity) : null;
  }

  async save(property: Partial<Property>): Promise<Property> {
    const entity = this.repo.create(property as DeepPartial<PropertyOrmEntity>);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  async upsertByCode(property: Partial<Property>): Promise<Property> {
    let entity = await this.repo.findOne({ where: { code: property.code } });
    if (entity) {
      Object.assign(entity, property);
    } else {
      entity = this.repo.create(property as DeepPartial<PropertyOrmEntity>);
    }
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  private toDomain(entity: PropertyOrmEntity): Property {
    const p = new Property();
    p.id = entity.id;
    p.code = entity.code;
    p.bu = entity.bu;
    p.area = entity.area;
    p.fullAddress = entity.fullAddress;
    p.officeKeys = entity.officeKeys;
    p.keysCount = entity.keysCount;
    p.securityKeysCount = entity.securityKeysCount;
    p.fobCount = entity.fobCount;
    p.electricityStatus = entity.electricityStatus;
    p.gasStatus = entity.gasStatus;
    p.active = entity.active;
    p.createdAt = entity.createdAt;
    p.updatedAt = entity.updatedAt;
    return p;
  }
}
