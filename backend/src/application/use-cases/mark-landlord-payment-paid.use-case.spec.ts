import { ConflictException } from '@nestjs/common';
import { MarkLandlordPaymentPaidUseCase } from './mark-landlord-payment-paid.use-case';
import { LandlordPayment } from '../../domain/landlord-payment/landlord-payment.entity';

function makePayment(overrides: Partial<LandlordPayment> = {}): LandlordPayment {
  const p = new LandlordPayment();
  Object.assign(p, {
    id: 'lp-1', propertyId: 'p1', landlordId: null, month: '2026-09', amountDue: 1200,
    amountPaid: 0, dateDue: null, datePaid: null, beneficiaryName: 'John', iban: null, bic: null,
    paymentReference: null, paymentMethod: null, status: 'pending', notes: null,
    active: true, createdAt: new Date(), updatedAt: new Date(),
  }, overrides);
  return p;
}

describe('MarkLandlordPaymentPaidUseCase', () => {
  let repo: any;
  let auditLog: any;
  let useCase: MarkLandlordPaymentPaidUseCase;

  beforeEach(() => {
    repo = { findById: jest.fn(async () => makePayment()), save: jest.fn(async (p: any) => ({ ...p })) };
    auditLog = { record: jest.fn(async () => {}) };
    useCase = new MarkLandlordPaymentPaidUseCase(repo, auditLog);
  });

  it('stamps a server-generated datePaid and marks paid', async () => {
    const before = Date.now();
    const result = await useCase.execute('lp-1', { userId: 'u1', role: 'manager' });
    expect(result.status).toBe('paid');
    expect(result.amountPaid).toBe(1200);
    expect(result.datePaid!.getTime()).toBeGreaterThanOrEqual(before);
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'update', entityType: 'LandlordPayment' }));
  });

  it('is idempotent: re-calling on an already-paid row throws', async () => {
    repo.findById.mockResolvedValue(makePayment({ status: 'paid' }));
    await expect(useCase.execute('lp-1')).rejects.toThrow(ConflictException);
  });
});
