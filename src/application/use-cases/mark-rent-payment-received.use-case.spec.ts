import { ConflictException } from '@nestjs/common';
import { MarkRentPaymentReceivedUseCase } from './mark-rent-payment-received.use-case';
import { RentPayment } from '../../domain/rent-payment/rent-payment.entity';

function makePayment(overrides: Partial<RentPayment> = {}): RentPayment {
  const p = new RentPayment();
  Object.assign(p, {
    id: 'payment-1', residentId: 'r1', bookingId: null, propertyId: 'p1', month: '2026-09',
    paymentDueDay: 5, rentAmount: 470, amountPaid: 100, lateStatus: 'demand_d1',
    paymentStatus: 'partially_paid', datePaid: null, notes: null, installments: [],
    d1ReminderSentAt: new Date(), d4NoticeSentAt: null, active: true, createdAt: new Date(), updatedAt: new Date(),
  }, overrides);
  return p;
}

describe('MarkRentPaymentReceivedUseCase', () => {
  let paymentRepo: any;
  let installmentRepo: any;
  let auditLog: any;
  let useCase: MarkRentPaymentReceivedUseCase;

  beforeEach(() => {
    const payment = makePayment();
    paymentRepo = {
      findById: jest.fn(async () => payment),
      save: jest.fn(async (p: any) => ({ ...p })),
    };
    installmentRepo = { save: jest.fn(async (i: any) => i) };
    auditLog = { record: jest.fn(async () => {}) };
    useCase = new MarkRentPaymentReceivedUseCase(paymentRepo, installmentRepo, auditLog);
  });

  it('records an installment for the outstanding gap and marks paid', async () => {
    const result = await useCase.execute('payment-1', { userId: 'u1', role: 'manager' });
    expect(installmentRepo.save).toHaveBeenCalledWith(expect.objectContaining({ amount: 370 }));
    expect(result.paymentStatus).toBe('paid');
    expect(result.amountPaid).toBe(470);
    expect(result.lateStatus).toBe('on_time');
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'update', entityType: 'RentPayment' }));
  });

  it('is idempotent: re-calling on an already-received invoice throws, not a silent no-op', async () => {
    paymentRepo.findById.mockResolvedValue(makePayment({ paymentStatus: 'paid', amountPaid: 470 }));
    await expect(useCase.execute('payment-1')).rejects.toThrow(ConflictException);
    expect(installmentRepo.save).not.toHaveBeenCalled();
  });
});
