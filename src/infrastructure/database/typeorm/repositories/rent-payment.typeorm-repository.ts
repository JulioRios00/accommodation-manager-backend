import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { RentPayment, RentPaymentInstallment } from '../../../../domain/rent-payment/rent-payment.entity';
import { IRentPaymentInstallmentRepository, IRentPaymentRepository } from '../../../../domain/rent-payment/rent-payment.repository';
import { RentPaymentInstallmentOrmEntity, RentPaymentOrmEntity } from '../entities/rent-payment.orm-entity';

@Injectable()
export class RentPaymentTypeOrmRepository implements IRentPaymentRepository {
  constructor(@InjectRepository(RentPaymentOrmEntity) private readonly repo: Repository<RentPaymentOrmEntity>) {}

  async findAll(filter?: { propertyId?: string; month?: string; residentId?: string }): Promise<RentPayment[]> {
    const where: FindOptionsWhere<RentPaymentOrmEntity> = { active: true };
    if (filter?.propertyId) where.propertyId = filter.propertyId;
    if (filter?.month) where.month = filter.month;
    if (filter?.residentId) where.residentId = filter.residentId;
    return (await this.repo.find({ where, order: { month: 'DESC' } })).map(this.toDomain);
  }

  async findById(id: string): Promise<RentPayment | null> {
    const e = await this.repo.findOne({ where: { id, active: true } });
    return e ? this.toDomain(e) : null;
  }

  async save(payment: Partial<RentPayment>): Promise<RentPayment> {
    const e = this.repo.create(payment as DeepPartial<RentPaymentOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  private toDomain(e: RentPaymentOrmEntity): RentPayment {
    const d = new RentPayment();
    d.id = e.id; d.residentId = e.residentId; d.bookingId = e.bookingId; d.propertyId = e.propertyId;
    d.month = e.month; d.paymentDueDay = e.paymentDueDay ?? null;
    d.rentAmount = Number(e.rentAmount); d.amountPaid = Number(e.amountPaid);
    d.lateStatus = e.lateStatus; d.notes = e.notes ?? null; d.installments = [];
    d.active = e.active; d.createdAt = e.createdAt; d.updatedAt = e.updatedAt;
    return d;
  }
}

@Injectable()
export class RentPaymentInstallmentTypeOrmRepository implements IRentPaymentInstallmentRepository {
  constructor(@InjectRepository(RentPaymentInstallmentOrmEntity) private readonly repo: Repository<RentPaymentInstallmentOrmEntity>) {}

  async findByPayment(rentPaymentId: string): Promise<RentPaymentInstallment[]> {
    return (await this.repo.find({ where: { rentPaymentId }, order: { paidAt: 'ASC' } })).map(e => {
      const d = new RentPaymentInstallment();
      d.id = e.id; d.rentPaymentId = e.rentPaymentId; d.amount = Number(e.amount);
      d.paidAt = e.paidAt; d.notes = e.notes ?? null; d.createdAt = e.createdAt;
      return d;
    });
  }

  async save(installment: Partial<RentPaymentInstallment>): Promise<RentPaymentInstallment> {
    const e = this.repo.create(installment as DeepPartial<RentPaymentInstallmentOrmEntity>);
    const saved = await this.repo.save(e);
    const d = new RentPaymentInstallment();
    d.id = saved.id; d.rentPaymentId = saved.rentPaymentId; d.amount = Number(saved.amount);
    d.paidAt = saved.paidAt; d.notes = saved.notes ?? null; d.createdAt = saved.createdAt;
    return d;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
