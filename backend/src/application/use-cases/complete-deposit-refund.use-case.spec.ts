import { ConflictException } from '@nestjs/common';
import { CompleteDepositRefundUseCase } from './complete-deposit-refund.use-case';
import { DepositTransaction } from '../../domain/deposit-transaction/deposit-transaction.entity';
import { Resident } from '../../domain/resident/resident.entity';

function makeDeposit(overrides: Partial<DepositTransaction> = {}): DepositTransaction {
  const d = new DepositTransaction();
  Object.assign(d, {
    id: 'deposit-1', type: 'refund', residentId: 'resident-1', bookingId: 'booking-1',
    propertyId: 'property-1', bedId: 'bed-1', residentName: 'Ana Silva', checkoutDate: new Date(),
    depositAmount: 470, proRataRentAmount: null, iban: 'IE29AIBK93115212345678', payeeAddress: null,
    status: 'pending', dateProcessed: null, bankReference: null, company: null, comments: null,
    refundDueDate: new Date(), completedBy: null, completedByName: null,
    active: true, createdAt: new Date(), updatedAt: new Date(),
  }, overrides);
  return d;
}

function makeResident(overrides: Partial<Resident> = {}): Resident {
  const r = new Resident();
  Object.assign(r, { id: 'resident-1', fullName: 'Ana Silva', email: 'ana@example.com', active: true }, overrides);
  return r;
}

describe('CompleteDepositRefundUseCase', () => {
  let depositRepo: any;
  let residentRepo: any;
  let auditLog: any;
  let emailService: any;
  let notificationService: any;
  let useCase: CompleteDepositRefundUseCase;

  beforeEach(() => {
    depositRepo = {
      findById: jest.fn(async () => makeDeposit()),
      save: jest.fn(async (d: any) => ({ ...d })),
    };
    residentRepo = { findById: jest.fn(async () => makeResident()) };
    auditLog = { record: jest.fn(async () => {}) };
    emailService = { send: jest.fn(async () => {}) };
    notificationService = { send: jest.fn(async () => {}) };
    useCase = new CompleteDepositRefundUseCase(depositRepo, residentRepo, auditLog, emailService, notificationService);
  });

  it('marks the refund done with a server timestamp and completer identity', async () => {
    const before = Date.now();
    const result = await useCase.execute('deposit-1', { userId: 'u1', role: 'administrator' }, 'Jane Admin');
    expect(result.status).toBe('done');
    expect(result.dateProcessed!.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.completedBy).toBe('u1');
    expect(result.completedByName).toBe('Jane Admin');
  });

  it('sends both the resident email and the in-app notification with the exact specified message', async () => {
    await useCase.execute('deposit-1', { userId: 'u1', role: 'administrator' });
    expect(emailService.send).toHaveBeenCalledWith(
      'ana@example.com',
      expect.any(String),
      expect.stringContaining('Your deposit refund payment has been completed and processed. Please allow standard bank clearing timelines for funds to arrive.'),
    );
    expect(notificationService.send).toHaveBeenCalledWith(
      'resident-1', 'deposit_refund_completed', expect.any(String),
      'Your deposit refund payment has been completed and processed. Please allow standard bank clearing timelines for funds to arrive.',
    );
  });

  it('is idempotent: completing an already-done refund throws, sends nothing twice', async () => {
    depositRepo.findById.mockResolvedValue(makeDeposit({ status: 'done', dateProcessed: new Date() }));
    await expect(useCase.execute('deposit-1')).rejects.toThrow(ConflictException);
    expect(depositRepo.save).not.toHaveBeenCalled();
    expect(emailService.send).not.toHaveBeenCalled();
    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it('rejects completing a non-refund deposit transaction', async () => {
    depositRepo.findById.mockResolvedValue(makeDeposit({ type: 'receipt' }));
    await expect(useCase.execute('deposit-1')).rejects.toThrow(ConflictException);
  });

  it('still completes the refund even if the email send fails', async () => {
    emailService.send.mockRejectedValue(new Error('Resend API error'));
    const result = await useCase.execute('deposit-1');
    expect(result.status).toBe('done');
    expect(notificationService.send).toHaveBeenCalled();
  });
});
