import { BadRequestException } from '@nestjs/common';
import { ExportLandlordDisbursementsUseCase } from './export-landlord-disbursements.use-case';
import { LandlordPayment } from '../../domain/landlord-payment/landlord-payment.entity';
import { Property } from '../../domain/property/property.entity';

function makePayment(overrides: Partial<LandlordPayment> = {}): LandlordPayment {
  const p = new LandlordPayment();
  Object.assign(p, {
    id: 'lp-1', propertyId: 'property-1', landlordId: null, month: '2026-09',
    amountDue: 1200, amountPaid: 0, dateDue: null, datePaid: null,
    beneficiaryName: 'John Landlord', iban: 'IE29AIBK93115212345678', bic: 'AIBKIE2D',
    paymentReference: null, paymentMethod: null, status: 'pending', notes: null,
    active: true, createdAt: new Date(), updatedAt: new Date(),
  }, overrides);
  return p;
}

function makeProperty(): Property {
  return Object.assign(new Property(), { id: 'property-1', code: '61RR' });
}

describe('ExportLandlordDisbursementsUseCase', () => {
  let paymentRepo: any;
  let propertyRepo: any;
  let landlordRepo: any;
  let useCase: ExportLandlordDisbursementsUseCase;
  let store: Map<string, LandlordPayment>;

  beforeEach(() => {
    store = new Map();
    paymentRepo = { findById: jest.fn(async (id: string) => store.get(id) ?? null) };
    propertyRepo = { findById: jest.fn(async () => makeProperty()) };
    landlordRepo = { findById: jest.fn(async () => null) };
    useCase = new ExportLandlordDisbursementsUseCase(paymentRepo, propertyRepo, landlordRepo);
  });

  it('exports a valid pending row as CSV', async () => {
    store.set('lp-1', makePayment());
    const csv = await useCase.execute(['lp-1']);
    expect(csv).toContain('IBAN,BIC,Payee,Amount,Reference');
    expect(csv).toContain('IE29AIBK93115212345678,AIBKIE2D,John Landlord,1200.00');
  });

  it('rejects a row already marked Paid (no re-export / double-payment path)', async () => {
    store.set('lp-1', makePayment({ status: 'paid' }));
    await expect(useCase.execute(['lp-1'])).rejects.toThrow(BadRequestException);
  });

  it('rejects a row with a malformed IBAN', async () => {
    store.set('lp-1', makePayment({ iban: 'NOTANIBAN' }));
    await expect(useCase.execute(['lp-1'])).rejects.toThrow(/invalid IBAN/);
  });

  it('rejects a row with a malformed BIC', async () => {
    store.set('lp-1', makePayment({ bic: 'BAD' }));
    await expect(useCase.execute(['lp-1'])).rejects.toThrow(/invalid BIC/);
  });

  it('rejects the whole batch if any one row fails validation', async () => {
    store.set('lp-1', makePayment());
    store.set('lp-2', makePayment({ id: 'lp-2', iban: null }));
    await expect(useCase.execute(['lp-1', 'lp-2'])).rejects.toThrow(BadRequestException);
  });

  it('rejects an empty selection', async () => {
    await expect(useCase.execute([])).rejects.toThrow(BadRequestException);
  });
});
