import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { CheckoutRecord } from '../../../../domain/checkout-record/checkout-record.entity';
import { ICheckoutRecordRepository } from '../../../../domain/checkout-record/checkout-record.repository';
import { CheckoutRecordOrmEntity } from '../entities/checkout-record.orm-entity';

@Injectable()
export class CheckoutRecordTypeOrmRepository implements ICheckoutRecordRepository {
  constructor(@InjectRepository(CheckoutRecordOrmEntity) private readonly repo: Repository<CheckoutRecordOrmEntity>) {}

  async findAll(): Promise<CheckoutRecord[]> {
    return (await this.repo.find({ where: { active: true }, order: { createdAt: 'DESC' } })).map(this.toDomain);
  }

  async findByBooking(bookingId: string): Promise<CheckoutRecord | null> {
    const e = await this.repo.findOne({ where: { bookingId, active: true } });
    return e ? this.toDomain(e) : null;
  }

  async save(record: Partial<CheckoutRecord>): Promise<CheckoutRecord> {
    const e = this.repo.create(record as DeepPartial<CheckoutRecordOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  private toDomain(e: CheckoutRecordOrmEntity): CheckoutRecord {
    const d = new CheckoutRecord();
    d.id = e.id; d.bookingId = e.bookingId; d.checkoutDate = e.checkoutDate;
    d.keysReturned = e.keysReturned ?? false; d.inspectionNotes = e.inspectionNotes ?? null;
    d.depositRefundAmount = e.depositRefundAmount ? Number(e.depositRefundAmount) : null;
    d.refundIban = e.refundIban ?? null;
    d.proRataRentAmount = e.proRataRentAmount ? Number(e.proRataRentAmount) : null;
    d.proRataAdjustment = e.proRataAdjustment ? Number(e.proRataAdjustment) : null;
    d.newResidentLinked = e.newResidentLinked ?? false; d.newResidentId = e.newResidentId ?? null;
    d.processedBy = e.processedBy ?? null; d.processedByName = e.processedByName ?? null;
    d.notes = e.notes ?? null; d.active = e.active;
    d.createdAt = e.createdAt; d.updatedAt = e.updatedAt;
    return d;
  }
}
