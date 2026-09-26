import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../../../../domain/booking/booking.entity';
import { IBookingRepository } from '../../../../domain/booking/booking.repository';
import { BookingOrmEntity } from '../entities/booking.orm-entity';
export declare class BookingTypeOrmRepository implements IBookingRepository {
    private readonly repo;
    constructor(repo: Repository<BookingOrmEntity>);
    findAll(status?: BookingStatus): Promise<Booking[]>;
    findById(id: string): Promise<Booking | null>;
    findByBedId(bedId: string): Promise<Booking[]>;
    findActiveByResidentId(residentId: string): Promise<Booking | null>;
    findAllActiveByResidentId(residentId: string): Promise<Booking[]>;
    findOverlappingActive(bedId: string, startDate: Date, endDate: Date, excludeId?: string): Promise<Booking[]>;
    save(booking: Partial<Booking>): Promise<Booking>;
    deleteByBedId(bedId: string): Promise<void>;
    delete(id: string): Promise<void>;
    private toDomain;
}
