import { Booking, BookingStatus } from './booking.entity';

export interface IBookingRepository {
  findAll(status?: BookingStatus): Promise<Booking[]>;
  findById(id: string): Promise<Booking | null>;
  findByBedId(bedId: string): Promise<Booking[]>;
  save(booking: Partial<Booking>): Promise<Booking>;
  deleteByBedId(bedId: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export const BOOKING_REPOSITORY = 'BOOKING_REPOSITORY';
