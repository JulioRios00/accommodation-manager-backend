import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Bedroom } from '../../../../domain/bedroom/bedroom.entity';
import { IBedroomRepository } from '../../../../domain/bedroom/bedroom.repository';
import { BedroomOrmEntity } from '../entities/bedroom.orm-entity';

@Injectable()
export class BedroomTypeOrmRepository implements IBedroomRepository {
  constructor(
    @InjectRepository(BedroomOrmEntity)
    private readonly repo: Repository<BedroomOrmEntity>,
  ) {}

  async findAll(propertyId?: string): Promise<Bedroom[]> {
    const where = propertyId ? { propertyId, active: true } : { active: true };
    return (await this.repo.find({ where, order: { name: 'ASC' } })).map(this.toDomain);
  }

  async findById(id: string): Promise<Bedroom | null> {
    const e = await this.repo.findOne({ where: { id, active: true } });
    return e ? this.toDomain(e) : null;
  }

  async findByPropertyAndName(propertyId: string, name: string): Promise<Bedroom | null> {
    const e = await this.repo.findOne({ where: { propertyId, name, active: true } });
    return e ? this.toDomain(e) : null;
  }

  async save(bedroom: Partial<Bedroom>): Promise<Bedroom> {
    const e = this.repo.create(bedroom as DeepPartial<BedroomOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  private toDomain(e: BedroomOrmEntity): Bedroom {
    const d = new Bedroom();
    d.id = e.id;
    d.propertyId = e.propertyId;
    d.name = e.name;
    d.active = e.active;
    d.createdAt = e.createdAt;
    d.updatedAt = e.updatedAt;
    return d;
  }
}
