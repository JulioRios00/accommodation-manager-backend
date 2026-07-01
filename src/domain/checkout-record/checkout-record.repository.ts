import { CheckoutRecord } from './checkout-record.entity';

export const CHECKOUT_RECORD_REPOSITORY = 'CHECKOUT_RECORD_REPOSITORY';

export interface ICheckoutRecordRepository {
  findAll(): Promise<CheckoutRecord[]>;
  findByBooking(bookingId: string): Promise<CheckoutRecord | null>;
  save(record: Partial<CheckoutRecord>): Promise<CheckoutRecord>;
}
