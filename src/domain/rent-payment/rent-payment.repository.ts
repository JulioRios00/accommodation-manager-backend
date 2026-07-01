import { RentPayment, RentPaymentInstallment } from './rent-payment.entity';

export const RENT_PAYMENT_REPOSITORY = 'RENT_PAYMENT_REPOSITORY';
export const RENT_PAYMENT_INSTALLMENT_REPOSITORY = 'RENT_PAYMENT_INSTALLMENT_REPOSITORY';

export interface IRentPaymentRepository {
  findAll(filter?: { propertyId?: string; month?: string; residentId?: string }): Promise<RentPayment[]>;
  findById(id: string): Promise<RentPayment | null>;
  save(payment: Partial<RentPayment>): Promise<RentPayment>;
  delete(id: string): Promise<void>;
}

export interface IRentPaymentInstallmentRepository {
  findByPayment(rentPaymentId: string): Promise<RentPaymentInstallment[]>;
  save(installment: Partial<RentPaymentInstallment>): Promise<RentPaymentInstallment>;
  delete(id: string): Promise<void>;
}
