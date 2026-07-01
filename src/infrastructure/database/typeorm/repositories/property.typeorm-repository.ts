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
    p.officeKeysCount = entity.officeKeysCount ?? 0;
    p.keysCount = entity.keysCount ?? 0;
    p.securityKeysCount = entity.securityKeysCount ?? 0;
    p.fobCount = entity.fobCount ?? 0;
    p.keyCode = entity.keyCode ?? null;
    p.electricityStatus = entity.electricityStatus ?? null;
    p.electricityMprn = entity.electricityMprn ?? null;
    p.electricitySupplier = entity.electricitySupplier ?? null;
    p.electricityAccountNumber = entity.electricityAccountNumber ?? null;
    p.electricityKeypadCode = entity.electricityKeypadCode ?? null;
    p.gasStatus = entity.gasStatus ?? null;
    p.gasGprn = entity.gasGprn ?? null;
    p.gasSupplier = entity.gasSupplier ?? null;
    p.gasAccountNumber = entity.gasAccountNumber ?? null;
    p.gasPin = entity.gasPin ?? null;
    p.wasteSupplier = entity.wasteSupplier ?? null;
    p.wasteAccountNumber = entity.wasteAccountNumber ?? null;
    p.wasteEmail = entity.wasteEmail ?? null;
    p.wastePassword = entity.wastePassword ?? null;
    p.wastePaymentType = entity.wastePaymentType ?? null;
    p.wasteMonthlyAmount = entity.wasteMonthlyAmount ? Number(entity.wasteMonthlyAmount) : null;
    p.wasteStatus = entity.wasteStatus ?? null;
    p.internetSupplier = entity.internetSupplier ?? null;
    p.internetAccountNumber = entity.internetAccountNumber ?? null;
    p.internetEmail = entity.internetEmail ?? null;
    p.internetUsername = entity.internetUsername ?? null;
    p.internetPassword = entity.internetPassword ?? null;
    p.internetPaymentType = entity.internetPaymentType ?? null;
    p.internetStatus = entity.internetStatus ?? null;
    p.internetContractEndDate = entity.internetContractEndDate ?? null;
    p.salesDescription = entity.salesDescription ?? null;
    p.active = entity.active;
    p.createdAt = entity.createdAt;
    p.updatedAt = entity.updatedAt;
    return p;
  }
}
