import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Company } from '../../../../domain/company/company.entity';
import { ICompanyRepository } from '../../../../domain/company/company.repository';
import { CompanyOrmEntity } from '../entities/company.orm-entity';

@Injectable()
export class CompanyTypeOrmRepository implements ICompanyRepository {
  constructor(@InjectRepository(CompanyOrmEntity) private readonly repo: Repository<CompanyOrmEntity>) {}

  async findAll(): Promise<Company[]> {
    return (await this.repo.find({ where: { active: true } })).map(this.toDomain);
  }

  async findById(id: string): Promise<Company | null> {
    const e = await this.repo.findOne({ where: { id, active: true } });
    return e ? this.toDomain(e) : null;
  }

  async save(company: Partial<Company>): Promise<Company> {
    const e = this.repo.create(company as DeepPartial<CompanyOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  private toDomain(e: CompanyOrmEntity): Company {
    const d = new Company();
    d.id = e.id; d.name = e.name; d.address = e.address ?? null;
    d.contactEmail = e.contactEmail ?? null; d.phone = e.phone ?? null;
    d.active = e.active; d.createdAt = e.createdAt; d.updatedAt = e.updatedAt;
    return d;
  }
}
