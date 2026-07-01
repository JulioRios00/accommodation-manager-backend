import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { PropertyAdministrator } from '../../../../domain/property-administrator/property-administrator.entity';
import { IPropertyAdministratorRepository } from '../../../../domain/property-administrator/property-administrator.repository';
import { PropertyAdministratorOrmEntity } from '../entities/property-administrator.orm-entity';

@Injectable()
export class PropertyAdministratorTypeOrmRepository implements IPropertyAdministratorRepository {
  constructor(@InjectRepository(PropertyAdministratorOrmEntity) private readonly repo: Repository<PropertyAdministratorOrmEntity>) {}

  async findByProperty(propertyId: string): Promise<PropertyAdministrator[]> {
    return (await this.repo.find({ where: { propertyId } })).map(this.toDomain);
  }

  async save(admin: Partial<PropertyAdministrator>): Promise<PropertyAdministrator> {
    const e = this.repo.create(admin as DeepPartial<PropertyAdministratorOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByPropertyAndUser(propertyId: string, clerkUserId: string): Promise<void> {
    await this.repo.delete({ propertyId, clerkUserId });
  }

  private toDomain(e: PropertyAdministratorOrmEntity): PropertyAdministrator {
    const d = new PropertyAdministrator();
    d.id = e.id; d.propertyId = e.propertyId; d.clerkUserId = e.clerkUserId;
    d.clerkUserName = e.clerkUserName; d.addedAt = e.addedAt;
    return d;
  }
}
