import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { ServiceProvider } from '../../../../domain/service-provider/service-provider.entity';
import { IServiceProviderRepository } from '../../../../domain/service-provider/service-provider.repository';
import { ServiceProviderOrmEntity } from '../entities/service-provider.orm-entity';

@Injectable()
export class ServiceProviderTypeOrmRepository implements IServiceProviderRepository {
  constructor(@InjectRepository(ServiceProviderOrmEntity) private readonly repo: Repository<ServiceProviderOrmEntity>) {}

  async findAll(): Promise<ServiceProvider[]> {
    return (await this.repo.find({ where: { active: true } })).map(this.toDomain);
  }

  async findById(id: string): Promise<ServiceProvider | null> {
    const e = await this.repo.findOne({ where: { id, active: true } });
    return e ? this.toDomain(e) : null;
  }

  async save(sp: Partial<ServiceProvider>): Promise<ServiceProvider> {
    const e = this.repo.create(sp as DeepPartial<ServiceProviderOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  private toDomain(e: ServiceProviderOrmEntity): ServiceProvider {
    const d = new ServiceProvider();
    d.id = e.id; d.name = e.name; d.contactName = e.contactName ?? null;
    d.phone = e.phone ?? null; d.email = e.email ?? null; d.specialty = e.specialty ?? null;
    d.notes = e.notes ?? null; d.active = e.active;
    d.createdAt = e.createdAt; d.updatedAt = e.updatedAt;
    return d;
  }
}
