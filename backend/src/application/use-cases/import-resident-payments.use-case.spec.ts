import * as XLSX from 'xlsx';
import { ImportResidentPaymentsUseCase } from './import-resident-payments.use-case';

/**
 * Re-import overwrites: the tracking sheet is the record of what was paid, so where it and
 * the app disagree the sheet wins. The risk that buys is clobbering something the sheet does
 * not know about, so most of these tests are about what must survive an update.
 */

const HEADERS = ['Code', 'Full Address', 'TenantPaymentDay', 'Resident', 'Rent', 'Paid', 'Payment Date', 'Notes', 'Late Status'];

const row = (over: Partial<Record<'rent' | 'paid' | 'notes' | 'late', any>> = {}) => [
  '61RR', '61 Rathdown Road', 9, 'Ana Silva',
  over.rent ?? 500, over.paid ?? 500, null, over.notes ?? null, over.late ?? null,
];

function buffer(rows: any[][], tab = 'Jan 26') {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADERS, ...rows]), tab);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const EXISTING = {
  id: 'pay-1', propertyId: 'prop-1', residentId: 'res-1', month: '2026-01',
  rentAmount: 500, amountPaid: 0, lateStatus: 'on_time', paymentStatus: 'unpaid',
  notes: 'Part payment 12/01 €200', datePaid: null,
};

function build(existing: any[] = []) {
  const saves: any[] = [];
  const useCase = new ImportResidentPaymentsUseCase(
    {
      findAll: jest.fn(async () => existing),
      save: jest.fn(async (p: any) => { saves.push(p); return { ...p, id: p.id ?? 'pay-new' }; }),
    } as any,
    { findAll: jest.fn(async () => [{ id: 'prop-1', code: '61RR' }]) } as any,
    {
      findAll: jest.fn(async () => [{ id: 'res-1', fullName: 'Ana Silva', paymentDueDay: 9 }]),
      save: jest.fn(async (r: any) => r),
    } as any,
    { findAll: jest.fn(async () => []) } as any,
  );
  return { useCase, saves };
}

describe('ImportResidentPaymentsUseCase re-import', () => {
  it('inserts a month it has never seen', async () => {
    const { useCase, saves } = build();
    const res = await useCase.execute(buffer([row()]));
    expect(res).toMatchObject({ imported: 1, updated: 0, skipped: 0 });
    expect(saves[0].id).toBeUndefined();
  });

  it('updates a month it already holds instead of skipping it', async () => {
    const { useCase, saves } = build([EXISTING]);
    const res = await useCase.execute(buffer([row({ paid: 500 })]));
    expect(res).toMatchObject({ imported: 0, updated: 1, skipped: 0 });
    expect(saves[0].id).toBe('pay-1');
  });

  // The whole reason for the change: an imported 'on_time' must be correctable.
  it('clears a late status the sheet no longer asserts', async () => {
    const { useCase, saves } = build([EXISTING]);
    await useCase.execute(buffer([row({ late: null })]));
    expect(saves[0].lateStatus).toBeNull();
  });

  it('lets the sheet overwrite amounts and notes', async () => {
    const { useCase, saves } = build([EXISTING]);
    await useCase.execute(buffer([row({ paid: 350, notes: 'Paid by card' })]));
    expect(saves[0]).toMatchObject({ amountPaid: 350, notes: 'Paid by card' });
  });

  // merge() only touches the keys it is given, and these are not among them.
  it('does not write the escalation stamps, so reminders cannot re-send', async () => {
    const { useCase, saves } = build([EXISTING]);
    await useCase.execute(buffer([row()]));
    expect(saves[0]).not.toHaveProperty('d1ReminderSentAt');
    expect(saves[0]).not.toHaveProperty('d4NoticeSentAt');
    expect(saves[0]).not.toHaveProperty('createdAt');
  });

  it('derives payment status from the amounts rather than leaving a stale one', async () => {
    const { useCase, saves } = build([EXISTING]);
    await useCase.execute(buffer([row({ paid: 500, rent: 500 })]));
    expect(saves[0].paymentStatus).toBe('paid');
  });

  it('derives a partial payment', async () => {
    const { useCase, saves } = build([EXISTING]);
    await useCase.execute(buffer([row({ paid: 200, rent: 500 })]));
    expect(saves[0].paymentStatus).toBe('partially_paid');
  });

  it('derives unpaid when nothing was paid', async () => {
    const { useCase, saves } = build([EXISTING]);
    await useCase.execute(buffer([row({ paid: 0 })]));
    expect(saves[0].paymentStatus).toBe('unpaid');
  });

  it('collapses two rows for the same resident and month onto one record', async () => {
    const { useCase, saves } = build();
    const res = await useCase.execute(buffer([row({ paid: 200 }), row({ paid: 500 })]));
    expect(res).toMatchObject({ imported: 1, updated: 1 });
    expect(saves[1].id).toBe('pay-new');
    expect(saves[1].amountPaid).toBe(500);
  });

  it('still skips a row whose property or resident cannot be matched', async () => {
    const { useCase } = build();
    const unknown = ['99ZZ', 'Nowhere', 9, 'Ana Silva', 500, 500, null, null, null];
    const res = await useCase.execute(buffer([unknown]));
    expect(res).toMatchObject({ imported: 0, updated: 0, skipped: 1 });
    expect(res.skipReasons[0].reason).toContain('Property');
  });
});
