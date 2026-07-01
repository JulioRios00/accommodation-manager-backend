import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { LandlordPayment } from '../../../../domain/landlord-payment/landlord-payment.entity';
import { ILandlordPaymentRepository } from '../../../../domain/landlord-payment/landlord-payment.repository';
import { LandlordPaymentOrmEntity } from '../entities/landlord-payment.orm-entity';

@Injectable()
export class LandlordPaymentTypeOrmRepository implements ILandlordPaymentRepository {
  constructor(@InjectRepository(LandlordPaymentOrmEntity) private readonly repo: Repository<LandlordPaymentOrmEntity>) {}

  async findAll(filter?: { propertyId?: string; landlordId?: string; month?: string }): Promise<LandlordPayment[]> {
    const where: FindOptionsWhere<LandlordPaymentOrmEntity> = { active: true };
    if (filter?.propertyId) where.propertyId = filter.propertyId;
    if (filter?.landlordId) where.landlordId = filter.landlordId;
    if (filter?.month) where.month = filter.month;
    return (await this.repo.find({ where, order: { month: 'DESC' } })).map(this.toDomain);
  }

  async findById(id: string): Promise<LandlordPayment | null> {
    const e = await this.repo.findOne({ where: { id, active: true } });
    return e ? this.toDomain(e) : null;
  }

  async save(payment: Partial<LandlordPayment>): Promise<LandlordPayment> {
    const e = this.repo.create(payment as DeepPartial<LandlordPaymentOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  private toDomain(e: LandlordPaymentOrmEntity): LandlordPayment {
    const d = new LandlordPayment();
    d.id = e.id; d.propertyId = e.propertyId; d.landlordId = e.landlordId; d.month = e.month;
    d.amountDue = Number(e.amountDue); d.amountPaid = Number(e.amountPaid);
    d.dateDue = e.dateDue ?? null; d.datePaid = e.datePaid ?? null;
    d.beneficiaryName = e.beneficiaryName ?? null; d.iban = e.iban ?? null; d.bic = e.bic ?? null;
    d.paymentReference = e.paymentReference ?? null; d.paymentMethod = e.paymentMethod ?? null;
    d.status = e.status; d.notes = e.notes ?? null; d.active = e.active;
    d.createdAt = e.createdAt; d.updatedAt = e.updatedAt;
    return d;
  }
}
