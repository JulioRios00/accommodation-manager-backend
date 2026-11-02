import { PreviewOverdueEmailsUseCase } from './preview-overdue-emails.use-case';

/**
 * The preview has one job: say exactly what the escalation job would send. Both read the
 * same `escalationStage`, so these tests are mostly about the parts the preview adds —
 * which rows it shows, and that it writes nothing.
 */

const NOW = new Date(2026, 0, 20); // 20 Jan 2026

const payment = (over: Record<string, any> = {}) => ({
  id: 'pay-1', residentId: 'res-1', propertyId: 'prop-1', month: '2026-01', paymentDueDay: 9,
  rentAmount: 500, amountPaid: 100, paymentStatus: 'partially_paid',
  d1ReminderSentAt: null, d4NoticeSentAt: null, ...over,
});

function build(payments: any[], residentOver: Record<string, any> = {}) {
  const paymentRepo = { findAll: jest.fn(async () => payments), save: jest.fn() };
  const useCase = new PreviewOverdueEmailsUseCase(
    paymentRepo as any,
    { findAll: jest.fn(async () => [{ id: 'res-1', fullName: 'Ana Silva', email: 'ana@example.com', ...residentOver }]) } as any,
    { findAll: jest.fn(async () => [{ id: 'prop-1', code: '61RR' }]) } as any,
    {
      execute: jest.fn(async (key: string) => key === 'd1_reminder'
        ? { key, subject: 'Rent reminder — {{amountDue}} overdue', body: 'Hello {{residentName}}, {{amountDue}} was due {{dueDate}} ({{daysOverdue}} days ago).' }
        : { key, subject: 'FINAL NOTICE — {{amountDue}}', body: '{{residentName}}, this is a final notice.' }),
    } as any,
  );
  return { useCase, paymentRepo };
}

describe('PreviewOverdueEmailsUseCase', () => {
  it('renders the email with the resident, amount owed and days overdue filled in', async () => {
    const { useCase } = build([payment()]);
    const [row] = await useCase.execute(NOW);
    expect(row.subject).toBe('Rent reminder — €400.00 overdue');
    expect(row.body).toContain('Hello Ana Silva');
    expect(row.body).toContain('€400.00');
    expect(row.body).toContain('11 days ago');
    expect(row.amountDue).toBe(400);
  });

  it('writes nothing — previewing must not consume a reminder', async () => {
    const { useCase, paymentRepo } = build([payment()]);
    await useCase.execute(NOW);
    expect(paymentRepo.save).not.toHaveBeenCalled();
  });

  it('shows both stages when a charge is overdue enough for each', async () => {
    const { useCase } = build([payment()]);
    const rows = await useCase.execute(NOW);
    expect(rows.map(r => r.template)).toEqual(['d1_reminder', 'd4_urgent']);
    expect(rows.every(r => r.state === 'due to send')).toBe(true);
  });

  it('marks what has already gone out, and keeps it in the list', async () => {
    const sent = new Date(2026, 0, 11);
    const { useCase } = build([payment({ d1ReminderSentAt: sent })]);
    const rows = await useCase.execute(NOW);
    const d1 = rows.find(r => r.template === 'd1_reminder')!;
    expect(d1.state).toBe('already sent');
    expect(d1.sentAt).toEqual(sent);
  });

  // The job logs this and moves on, so it is invisible unless someone reads the logs.
  it('surfaces an overdue resident with no address instead of dropping them', async () => {
    const { useCase } = build([payment()], { email: null });
    const rows = await useCase.execute(NOW);
    expect(rows.every(r => r.state === 'no email address')).toBe(true);
    expect(rows[0].email).toBeNull();
    // The message is still rendered — it is what they would have been sent.
    expect(rows[0].subject).toContain('€400.00');
  });

  it('leaves out a payment that is settled', async () => {
    const { useCase } = build([payment({ paymentStatus: 'paid' })]);
    expect(await useCase.execute(NOW)).toEqual([]);
  });

  it('leaves out a payment that is not yet overdue', async () => {
    const { useCase } = build([payment({ paymentDueDay: 25 })]);
    expect(await useCase.execute(NOW)).toEqual([]);
  });

  it('shows only the reminder for a charge one day overdue', async () => {
    const { useCase } = build([payment({ paymentDueDay: 19 })]);
    const rows = await useCase.execute(NOW);
    expect(rows.map(r => r.template)).toEqual(['d1_reminder']);
  });

  it('orders the most overdue first', async () => {
    const { useCase } = build([
      payment({ id: 'a', paymentDueDay: 18, d4NoticeSentAt: new Date(2026, 0, 1) }),
      payment({ id: 'b', paymentDueDay: 2, d4NoticeSentAt: new Date(2026, 0, 1) }),
    ]);
    const rows = await useCase.execute(NOW);
    expect(rows[0].daysOverdue).toBeGreaterThan(rows[rows.length - 1].daysOverdue);
  });

  it('carries the property code for the row', async () => {
    const { useCase } = build([payment()]);
    const [row] = await useCase.execute(NOW);
    expect(row.propertyCode).toBe('61RR');
  });
});
