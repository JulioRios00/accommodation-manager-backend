import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { SaveLandlordPaymentDto, SaveLandlordPaymentUseCase } from './save-landlord-payment.use-case';

const meta: ArgumentMetadata = { type: 'body', metatype: SaveLandlordPaymentDto };
const pipe = new ValidationPipe({ whitelist: true, transform: true });

const valid = {
  propertyId: '11111111-1111-4111-8111-111111111111',
  landlordId: '22222222-2222-4222-8222-222222222222',
  month: '2026-09',
  amountDue: 1200,
};

const messages = async (body: Record<string, unknown>) => {
  try {
    await pipe.transform(body, meta);
    return null;
  } catch (e) {
    expect(e).toBeInstanceOf(BadRequestException);
    return JSON.stringify((e as BadRequestException).getResponse());
  }
};

describe('SaveLandlordPaymentDto validation', () => {
  it('accepts a pending -> paid update', async () => {
    const out: any = await pipe.transform(
      { ...valid, amountPaid: 1200, datePaid: '2026-09-09', status: 'paid' },
      meta,
    );
    expect(out.status).toBe('paid');
    expect(out.amountPaid).toBe(1200);
    expect(out.datePaid).toBe('2026-09-09');
  });

  it('strips the server-managed fields the edit dialog echoes back', async () => {
    const out: any = await pipe.transform(
      { ...valid, active: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' },
      meta,
    );
    expect(out).not.toHaveProperty('active');
    expect(out).not.toHaveProperty('createdAt');
    expect(out).not.toHaveProperty('updatedAt');
  });

  it('rejects a month that would overflow varchar(7)', async () => {
    expect(await messages({ ...valid, month: '2026-09-01' })).toContain('month');
    expect(await messages({ ...valid, month: 'September 2026' })).toContain('month');
    expect(await messages({ ...valid, month: '2026-13' })).toContain('month');
  });

  it('rejects a null or missing month instead of writing NULL to a NOT NULL column', async () => {
    expect(await messages({ ...valid, month: null })).toContain('month');
    const { month, ...noMonth } = valid;
    expect(await messages(noMonth)).toContain('month');
  });

  it('rejects a null propertyId and a null amountDue', async () => {
    expect(await messages({ ...valid, propertyId: null })).toContain('propertyId');
    expect(await messages({ ...valid, amountDue: null })).toContain('amountDue');
  });

  it('lower-cases status so the === "paid" comparisons keep working', async () => {
    const out: any = await pipe.transform({ ...valid, status: 'Paid' }, meta);
    expect(out.status).toBe('paid');
  });

  it('rejects an unknown status', async () => {
    expect(await messages({ ...valid, status: 'settled' })).toContain('status');
  });

  it('treats a cleared date input as null rather than an empty string', async () => {
    const out: any = await pipe.transform({ ...valid, datePaid: '', dateDue: '  ' }, meta);
    expect(out.datePaid).toBeNull();
    expect(out.dateDue).toBeNull();
  });

  it('rejects a malformed date', async () => {
    expect(await messages({ ...valid, datePaid: '09/09/2026' })).toContain('datePaid');
  });

  it('rejects over-long values against their column widths', async () => {
    expect(await messages({ ...valid, bic: 'B'.repeat(21) })).toContain('bic');
    expect(await messages({ ...valid, iban: 'I'.repeat(51) })).toContain('iban');
    expect(await messages({ ...valid, paymentReference: 'R'.repeat(101) })).toContain('paymentReference');
  });
});

describe('SaveLandlordPaymentUseCase update semantics', () => {
  const existing = { id: 'abc', propertyId: valid.propertyId, month: '2026-09', amountPaid: 500, status: 'partial' };

  const build = () => {
    const repo = {
      findById: jest.fn().mockResolvedValue(existing),
      findAll: jest.fn(),
      save: jest.fn().mockImplementation((p: any) => Promise.resolve({ id: 'abc', ...p })),
      delete: jest.fn(),
    };
    const auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    return { repo, auditLog, useCase: new SaveLandlordPaymentUseCase(repo as any, auditLog as any) };
  };

  it('does not reset amountPaid or status on an update that omits them', async () => {
    const { repo, useCase } = build();
    await useCase.execute({ ...valid, id: 'abc' } as SaveLandlordPaymentDto);
    const saved = repo.save.mock.calls[0][0];
    expect(saved.amountPaid).toBeUndefined();
    expect(saved.status).toBeUndefined();
  });

  it('still defaults amountPaid and status when creating', async () => {
    const { repo, useCase } = build();
    await useCase.execute({ ...valid } as SaveLandlordPaymentDto);
    const saved = repo.save.mock.calls[0][0];
    expect(saved.amountPaid).toBe(0);
    expect(saved.status).toBe('pending');
  });

  it('passes an explicit pending -> paid change through', async () => {
    const { repo, useCase } = build();
    await useCase.execute({ ...valid, id: 'abc', amountPaid: 1200, datePaid: '2026-09-09', status: 'paid' } as SaveLandlordPaymentDto);
    const saved = repo.save.mock.calls[0][0];
    expect(saved).toMatchObject({ id: 'abc', amountPaid: 1200, datePaid: '2026-09-09', status: 'paid' });
  });

  // Until the generic path stops being able to set 'paid' by hand, this is the only
  // record of who did it — see the manual-status question in the disbursements review.
  it('records who changed a payment, with the field diff', async () => {
    const { auditLog, useCase } = build();
    const actor = { userId: 'user_123', role: 'staff' };
    await useCase.execute(
      { ...valid, id: 'abc', status: 'paid', amountPaid: 1200, datePaid: '2026-09-09' } as SaveLandlordPaymentDto,
      actor,
    );
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actor,
        action: 'update',
        entityType: 'LandlordPayment',
        entityId: 'abc',
        before: expect.objectContaining({ status: 'partial' }),
        after: expect.objectContaining({ status: 'paid' }),
      }),
    );
  });

  it('records creates too', async () => {
    const { auditLog, useCase } = build();
    await useCase.execute({ ...valid } as SaveLandlordPaymentDto, { userId: 'u1' });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'create', entityType: 'LandlordPayment' }),
    );
  });

  it('still saves when there is no authenticated actor', async () => {
    const { repo, auditLog, useCase } = build();
    await useCase.execute({ ...valid, id: 'abc' } as SaveLandlordPaymentDto);
    expect(repo.save).toHaveBeenCalled();
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({ actor: undefined }));
  });

  it('does not log when the row was not found', async () => {
    const { repo, auditLog, useCase } = build();
    repo.findById.mockResolvedValue(null);
    await expect(useCase.execute({ ...valid, id: 'nope' } as SaveLandlordPaymentDto)).rejects.toThrow();
    expect(auditLog.record).not.toHaveBeenCalled();
  });

  it('404s on an unknown id', async () => {
    const { repo, useCase } = build();
    repo.findById.mockResolvedValue(null);
    await expect(useCase.execute({ ...valid, id: 'nope' } as SaveLandlordPaymentDto)).rejects.toThrow(/not found/);
  });
});
