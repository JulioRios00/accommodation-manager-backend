import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { AddRentInstallmentDto, AddRentInstallmentUseCase } from './add-rent-installment.use-case';

const meta: ArgumentMetadata = { type: 'body', metatype: AddRentInstallmentDto };
const pipe = new ValidationPipe({ whitelist: true, transform: true });

const payment = { id: 'rp-1', rentAmount: 500, amountPaid: 200, paymentStatus: 'partially_paid' };

function build(existing: any = payment) {
  const paymentRepo = {
    findById: jest.fn().mockResolvedValue(existing),
    save: jest.fn().mockImplementation((p: any) => Promise.resolve(p)),
  };
  const installmentRepo = {
    findByPayment: jest.fn(),
    save: jest.fn().mockImplementation((i: any) => Promise.resolve({ id: 'inst-1', ...i })),
    delete: jest.fn(),
  };
  const auditLog = { record: jest.fn().mockResolvedValue(undefined) };
  return {
    paymentRepo, installmentRepo, auditLog,
    useCase: new AddRentInstallmentUseCase(paymentRepo as any, installmentRepo as any, auditLog as any),
  };
}

describe('AddRentInstallmentDto validation', () => {
  const reject = async (body: Record<string, unknown>) => {
    try {
      await pipe.transform(body, meta);
      return null;
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      return JSON.stringify((e as BadRequestException).getResponse());
    }
  };

  // The amount is *added* to a running total, so a JSON string would concatenate
  // ("200" + 100 -> "200100") rather than sum.
  it('coerces a numeric string to a number', async () => {
    const out: any = await pipe.transform({ amount: '100', paidAt: '2026-10-01' }, meta);
    expect(out.amount).toBe(100);
    expect(typeof out.amount).toBe('number');
  });

  it('rejects zero, negative and non-numeric amounts', async () => {
    expect(await reject({ amount: 0, paidAt: '2026-10-01' })).toContain('amount');
    expect(await reject({ amount: -50, paidAt: '2026-10-01' })).toContain('amount');
    expect(await reject({ amount: 'abc', paidAt: '2026-10-01' })).toContain('amount');
  });

  it('rejects a missing or malformed date', async () => {
    expect(await reject({ amount: 100 })).toContain('paidAt');
    expect(await reject({ amount: 100, paidAt: '01/10/2026' })).toContain('paidAt');
  });

  it('strips a rentPaymentId sent in the body — the route owns it', async () => {
    const out: any = await pipe.transform(
      { amount: 100, paidAt: '2026-10-01', rentPaymentId: 'someone-elses' },
      meta,
    );
    expect(out.rentPaymentId).toBeUndefined();
  });
});

describe('AddRentInstallmentUseCase', () => {
  const dto = { rentPaymentId: 'rp-1', amount: 100, paidAt: '2026-10-01' } as AddRentInstallmentDto;

  it('adds to amountPaid rather than replacing it', async () => {
    const { paymentRepo, useCase } = build();
    await useCase.execute(dto);
    expect(paymentRepo.save).toHaveBeenCalledWith(expect.objectContaining({ amountPaid: 300 }));
  });

  it('re-derives the status as the balance is settled', async () => {
    const { paymentRepo, useCase } = build();
    await useCase.execute({ ...dto, amount: 300 });
    expect(paymentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaid: 500, paymentStatus: 'paid' }),
    );
  });

  it('stays partially_paid while short of the rent', async () => {
    const { paymentRepo, useCase } = build();
    await useCase.execute({ ...dto, amount: 50 });
    expect(paymentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaid: 250, paymentStatus: 'partially_paid' }),
    );
  });

  // Guards the string-concatenation bug directly at the use case, in case something
  // reaches it without passing through the pipe.
  it('sums correctly even if the amount arrives as a string', async () => {
    const { paymentRepo, useCase } = build();
    await useCase.execute({ ...dto, amount: '100' as unknown as number });
    expect(paymentRepo.save).toHaveBeenCalledWith(expect.objectContaining({ amountPaid: 300 }));
  });

  it('rejects a non-positive amount', async () => {
    const { useCase } = build();
    await expect(useCase.execute({ ...dto, amount: 0 })).rejects.toThrow(/greater than zero/);
  });

  it('404s when the payment does not exist', async () => {
    const { useCase, installmentRepo } = build(null);
    await expect(useCase.execute(dto)).rejects.toThrow(/not found/);
    expect(installmentRepo.save).not.toHaveBeenCalled();
  });

  it('records who added the part payment', async () => {
    const { auditLog, useCase } = build();
    const actor = { userId: 'u1', role: 'staff' };
    await useCase.execute(dto, actor);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actor,
        entityType: 'RentPayment',
        entityId: 'rp-1',
        before: expect.objectContaining({ amountPaid: 200 }),
        after: expect.objectContaining({ amountPaid: 300 }),
      }),
    );
  });

  it('returns the stored installment', async () => {
    const { useCase } = build();
    const result = await useCase.execute(dto);
    expect(result).toMatchObject({ id: 'inst-1', amount: 100, paidAt: '2026-10-01' });
  });
});
