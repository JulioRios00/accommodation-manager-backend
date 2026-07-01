import { LandlordPayment } from './landlord-payment.entity';

export const LANDLORD_PAYMENT_REPOSITORY = 'LANDLORD_PAYMENT_REPOSITORY';

export interface ILandlordPaymentRepository {
  findAll(filter?: { propertyId?: string; landlordId?: string; month?: string }): Promise<LandlordPayment[]>;
  findById(id: string): Promise<LandlordPayment | null>;
  save(payment: Partial<LandlordPayment>): Promise<LandlordPayment>;
  delete(id: string): Promise<void>;
}
