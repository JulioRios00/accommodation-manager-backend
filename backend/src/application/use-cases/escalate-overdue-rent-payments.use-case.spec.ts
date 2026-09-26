import { EscalateOverdueRentPaymentsUseCase } from './escalate-overdue-rent-payments.use-case';
import { GetEmailTemplateUseCase } from './get-email-template.use-case';
import { RentPayment } from '../../domain/rent-payment/rent-payment.entity';
import { Resident } from '../../domain/resident/resident.entity';
import { defaultEmailTemplate } from '../../domain/email-template/email-template.entity';

// Due on the 5th; "day N" in the test names means N days past that due date.
const DUE_DAY = 5;
const MONTH = '2026-09';
function dateAt(dayOfMonth: number): Date {
  return new Date(2026, 8, dayOfMonth);
}

function makePayment(overrides: Partial<RentPayment> = {}): RentPayment {
  const p = new RentPayment();
  Object.assign(p, {
    id: 'payment-1', residentId: 'resident-1', bookingId: null, propertyId: 'property-1',
    month: MONTH, paymentDueDay: DUE_DAY, rentAmount: 470, amountPaid: 0,
    lateStatus: 'on_time', paymentStatus: 'unpaid', datePaid: null, notes: null,
    installments: [], d1ReminderSentAt: null, d4NoticeSentAt: null,
    active: true, createdAt: new Date(), updatedAt: new Date(),
  }, overrides);
  return p;
}

function makeResident(overrides: Partial<Resident> = {}): Resident {
  const r = new Resident();
  Object.assign(r, { id: 'resident-1', fullName: 'Ana Silva', email: 'ana@example.com', active: true }, overrides);
  return r;
}

const BASE_RESULT = { d1Sent: 0, d4Sent: 0, d1Failed: 0, d4Failed: 0, skippedNoEmail: 0 };

describe('EscalateOverdueRentPaymentsUseCase', () => {
  let paymentRepo: any;
  let residentRepo: any;
  let emailService: any;
  let auditLog: any;
  let useCase: EscalateOverdueRentPaymentsUseCase;
  let store: Map<string, RentPayment>;

  beforeEach(() => {
    store = new Map();
    paymentRepo = {
      findAll: jest.fn(async () => [...store.values()]),
      findById: jest.fn(async (id: string) => store.get(id) ?? null),
      save: jest.fn(async (p: RentPayment) => { store.set(p.id, { ...p } as RentPayment); return store.get(p.id)!; }),
    };
    residentRepo = { findById: jest.fn(async () => makeResident()) };
    emailService = { send: jest.fn(async () => {}) };
    auditLog = { record: jest.fn(async () => {}) };
    const getTemplate = { execute: jest.fn(async (key: string) => defaultEmailTemplate(key as any)) } as unknown as GetEmailTemplateUseCase;
    useCase = new EscalateOverdueRentPaymentsUseCase(paymentRepo, residentRepo, getTemplate, emailService, auditLog);
  });

  it('day 0 (due today): sends nothing', async () => {
    store.set('payment-1', makePayment());
    const result = await useCase.execute(dateAt(DUE_DAY));
    expect(result).toEqual(BASE_RESULT);
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('day 1: sends exactly one D+1 email, stamps d1ReminderSentAt, and records an email_sent audit entry', async () => {
    store.set('payment-1', makePayment());
    const result = await useCase.execute(dateAt(DUE_DAY + 1));
    expect(result).toEqual({ ...BASE_RESULT, d1Sent: 1 });
    expect(emailService.send).toHaveBeenCalledTimes(1);
    expect(store.get('payment-1')!.d1ReminderSentAt).not.toBeNull();
    expect(store.get('payment-1')!.lateStatus).toBe('demand_d1');
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'email_sent',
      entityType: 'RentPayment',
      entityId: 'payment-1',
      after: expect.objectContaining({ template: 'd1_reminder', recipientEmail: 'ana@example.com' }),
    }));
  });

  it('day 4, still pending (D+1 already sent on day 1): sends exactly one D+4 email', async () => {
    store.set('payment-1', makePayment({ d1ReminderSentAt: dateAt(DUE_DAY + 1), lateStatus: 'demand_d1' }));
    const result = await useCase.execute(dateAt(DUE_DAY + 4));
    expect(result).toEqual({ ...BASE_RESULT, d4Sent: 1 });
    expect(emailService.send).toHaveBeenCalledTimes(1);
    expect(store.get('payment-1')!.d4NoticeSentAt).not.toBeNull();
    expect(store.get('payment-1')!.lateStatus).toBe('final_demand_d4');
  });

  it('day 4, marked Received on day 2: no D+4 email fires', async () => {
    store.set('payment-1', makePayment({
      d1ReminderSentAt: dateAt(DUE_DAY + 1), lateStatus: 'on_time',
      paymentStatus: 'paid', amountPaid: 470, datePaid: dateAt(DUE_DAY + 2),
    }));
    const result = await useCase.execute(dateAt(DUE_DAY + 4));
    expect(result).toEqual(BASE_RESULT);
    expect(emailService.send).not.toHaveBeenCalled();
    expect(store.get('payment-1')!.d4NoticeSentAt).toBeNull();
  });

  it('re-running the same day does not duplicate an already-sent D+1', async () => {
    store.set('payment-1', makePayment());
    await useCase.execute(dateAt(DUE_DAY + 1));
    emailService.send.mockClear();
    const second = await useCase.execute(dateAt(DUE_DAY + 1));
    expect(second).toEqual(BASE_RESULT);
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('a missed run self-heals: D+1 still fires late on day 3 if never sent', async () => {
    store.set('payment-1', makePayment());
    const result = await useCase.execute(dateAt(DUE_DAY + 3));
    // Both thresholds are already crossed on first run — D+1 and D+4 are independent
    // thresholds, so a payment discovered late catches up on whichever it's actually passed.
    expect(result.d1Sent).toBe(1);
    expect(store.get('payment-1')!.d1ReminderSentAt).not.toBeNull();
  });

  it('skips (and counts) a payment whose resident has no email, without crashing the run', async () => {
    residentRepo.findById.mockResolvedValue(makeResident({ email: null }));
    store.set('payment-1', makePayment());
    const result = await useCase.execute(dateAt(DUE_DAY + 1));
    expect(result).toEqual({ ...BASE_RESULT, skippedNoEmail: 1 });
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('records email_fail and does not stamp d1ReminderSentAt when the send throws', async () => {
    emailService.send.mockRejectedValue(new Error('Resend API error: invalid recipient'));
    store.set('payment-1', makePayment());
    const result = await useCase.execute(dateAt(DUE_DAY + 1));
    expect(result).toEqual({ ...BASE_RESULT, d1Failed: 1 });
    expect(store.get('payment-1')!.d1ReminderSentAt).toBeNull();
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'email_fail',
      entityType: 'RentPayment',
      entityId: 'payment-1',
      after: expect.objectContaining({ template: 'd1_reminder', error: 'Resend API error: invalid recipient' }),
    }));
  });

  it('one payment failing to send does not stop another payment in the same run', async () => {
    store.set('payment-1', makePayment({ id: 'payment-1', residentId: 'resident-1' }));
    store.set('payment-2', makePayment({ id: 'payment-2', residentId: 'resident-2' }));
    residentRepo.findById.mockImplementation(async (id: string) =>
      makeResident({ id, email: id === 'resident-1' ? 'fails@example.com' : 'ok@example.com' }));
    emailService.send.mockImplementation(async (to: string) => {
      if (to === 'fails@example.com') throw new Error('send failed');
    });

    const result = await useCase.execute(dateAt(DUE_DAY + 1));
    expect(result).toEqual({ ...BASE_RESULT, d1Sent: 1, d1Failed: 1 });
    expect(store.get('payment-1')!.d1ReminderSentAt).toBeNull();
    expect(store.get('payment-2')!.d1ReminderSentAt).not.toBeNull();
  });
});
