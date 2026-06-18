import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Resident } from '../../../../domain/resident/resident.entity';
import { IResidentRepository } from '../../../../domain/resident/resident.repository';
import { ResidentOrmEntity } from '../entities/resident.orm-entity';

@Injectable()
export class ResidentTypeOrmRepository implements IResidentRepository {
  constructor(
    @InjectRepository(ResidentOrmEntity)
    private readonly repo: Repository<ResidentOrmEntity>,
  ) {}

  async findAll(): Promise<Resident[]> {
    const entities = await this.repo.find({ where: { active: true } });
    return entities.map(this.toDomain);
  }

  async findById(id: string): Promise<Resident | null> {
    const entity = await this.repo.findOne({ where: { id, active: true } });
    return entity ? this.toDomain(entity) : null;
  }

  async save(resident: Partial<Resident>): Promise<Resident> {
    const entity = this.repo.create(resident as DeepPartial<ResidentOrmEntity>);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  private toDomain(entity: ResidentOrmEntity): Resident {
    const r = new Resident();
    r.id = entity.id;
    r.fullName = entity.fullName;
    r.email = entity.email;
    r.telephone = entity.telephone;
    r.nationality = entity.nationality;
    r.personalId = entity.personalId;
    r.iban = entity.iban;
    r.emergencyContact = entity.emergencyContact;
    r.source = entity.source;
    r.createdAt = entity.createdAt;
    r.updatedAt = entity.updatedAt;
    return r;
  }
}
