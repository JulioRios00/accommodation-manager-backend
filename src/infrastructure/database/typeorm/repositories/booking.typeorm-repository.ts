import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Booking, BookingStatus } from '../../../../domain/booking/booking.entity';
import { IBookingRepository } from '../../../../domain/booking/booking.repository';
import { BookingOrmEntity } from '../entities/booking.orm-entity';

@Injectable()
export class BookingTypeOrmRepository implements IBookingRepository {
  constructor(
    @InjectRepository(BookingOrmEntity)
    private readonly repo: Repository<BookingOrmEntity>,
  ) {}

  async findAll(status?: BookingStatus): Promise<Booking[]> {
    const where = status ? { status, active: true } : { active: true };
    const entities = await this.repo.find({
      where,
      relations: ['bed', 'bed.property', 'resident'],
    });
    return entities.map(this.toDomain);
  }

  async findById(id: string): Promise<Booking | null> {
    const entity = await this.repo.findOne({
      where: { id, active: true },
      relations: ['bed', 'resident'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByBedId(bedId: string): Promise<Booking[]> {
    const entities = await this.repo.find({
      where: { bedId, active: true },
      relations: ['resident'],
    });
    return entities.map(this.toDomain);
  }

  async findActiveByResidentId(residentId: string): Promise<Booking | null> {
    const entity = await this.repo.findOne({
      where: { residentId, status: 'active', active: true },
      relations: ['bed', 'bed.property'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findOverlappingActive(bedId: string, startDate: Date, endDate: Date, excludeId?: string): Promise<Booking[]> {
    const qb = this.repo.createQueryBuilder('b')
      .where('b.bedId = :bedId', { bedId })
      .andWhere('b.active = true')
      .andWhere("b.status IN ('active', 'upcoming')")
      .andWhere('b.checkInDate < :endDate', { endDate })
      .andWhere('(COALESCE(b.checkOutDate, b.contractEndDate) > :startDate OR (b.checkOutDate IS NULL AND b.contractEndDate IS NULL))', { startDate });
    if (excludeId) {
      qb.andWhere('b.id != :excludeId', { excludeId });
    }
    return (await qb.getMany()).map(this.toDomain);
  }

  async save(booking: Partial<Booking>): Promise<Booking> {
    const entity = this.repo.create(booking as DeepPartial<BookingOrmEntity>);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async deleteByBedId(bedId: string): Promise<void> {
    await this.repo.update({ bedId }, { active: false });
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  private toDomain(entity: BookingOrmEntity): Booking {
    const b = new Booking();
    b.id = entity.id;
    b.bedId = entity.bedId;
    b.residentId = entity.residentId;
    b.checkInDate = entity.checkInDate;
    b.contractEndDate = entity.contractEndDate;
    b.checkOutDate = entity.checkOutDate;
    b.depositAmount = Number(entity.depositAmount);
    b.rentAmount = Number(entity.rentAmount);
    b.isHeadResident = entity.isHeadResident;
    b.isTemporary = entity.isTemporary;
    b.status = entity.status as BookingStatus;
    b.comments = entity.comments;
    b.createdAt = entity.createdAt;
    b.updatedAt = entity.updatedAt;
    return b;
  }
}
