import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Landlord } from '../../../../domain/landlord/landlord.entity';
import { ILandlordRepository } from '../../../../domain/landlord/landlord.repository';
import { LandlordOrmEntity } from '../entities/landlord.orm-entity';

@Injectable()
export class LandlordTypeOrmRepository implements ILandlordRepository {
  constructor(@InjectRepository(LandlordOrmEntity) private readonly repo: Repository<LandlordOrmEntity>) {}

  async findAll(): Promise<Landlord[]> {
    return (await this.repo.find({ where: { active: true } })).map(this.toDomain);
  }

  async findById(id: string): Promise<Landlord | null> {
    const e = await this.repo.findOne({ where: { id, active: true } });
    return e ? this.toDomain(e) : null;
  }

  async save(landlord: Partial<Landlord>): Promise<Landlord> {
    const e = this.repo.create(landlord as DeepPartial<LandlordOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  private toDomain(e: LandlordOrmEntity): Landlord {
    const d = new Landlord();
    d.id = e.id; d.name = e.name; d.email = e.email ?? null; d.address = e.address ?? null;
    d.bankName = e.bankName ?? null; d.sortCode = e.sortCode ?? null;
    d.accountNumber = e.accountNumber ?? null; d.iban = e.iban ?? null; d.bic = e.bic ?? null;
    d.paymentReference = e.paymentReference ?? null; d.paymentMethod = e.paymentMethod ?? null;
    d.payoutDay = e.payoutDay ?? null; d.residentPaymentDueDay = e.residentPaymentDueDay ?? null;
    d.active = e.active; d.createdAt = e.createdAt; d.updatedAt = e.updatedAt;
    return d;
  }
}
