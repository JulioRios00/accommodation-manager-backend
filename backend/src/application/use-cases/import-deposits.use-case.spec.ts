import { ImportDepositsUseCase } from './import-deposits.use-case';
import { parseDeposits } from '../../infrastructure/parsers/deposits.parser';

jest.mock('../../infrastructure/parsers/deposits.parser', () => ({ parseDeposits: jest.fn() }));
const parseDepositsMock = parseDeposits as jest.MockedFunction<typeof parseDeposits>;

const PROPERTY_ID = 'prop-1';
const sheetRow = (over: Partial<ReturnType<typeof baseRow>> = {}) => ({ ...baseRow(), ...over });

function baseRow() {
  return {
    transactionDate: null,
    transactionType: 'receipt',
    company: 'SA Ltd',
    propertyCode: 'P1',
    bedNumber: null,
    bedroomLetter: null,
    residentName: 'Ana Silva',
    checkoutDate: null,
    depositAmount: 470,
    proRataRentAmount: null,
    iban: null,
    payeeAddress: null,
    status: 'done',
    dateProcessed: new Date(Date.UTC(2025, 11, 3)),
    bankReference: null,
    comments: null,
  };
}

/** A row already in the DB that the sheet above matches on
 *  propertyId|residentName|type|depositAmount, but with no processed date yet. */
const existingTx = {
  id: 'tx-1',
  type: 'receipt',
  propertyId: PROPERTY_ID,
  residentName: 'Ana Silva',
  depositAmount: 470,
  status: 'pending',
  dateProcessed: null,
  residentId: 'res-1',
  bedId: 'bed-1',
  bookingId: 'booking-1',
  refundDueDate: '2025-12-20',
  completedBy: 'u1',
  completedByName: 'Someone',
};

function build(existing: any[], residents: any[] = [{ id: 'res-1', fullName: 'Ana Silva' }]) {
  const txRepo = {
    findAll: jest.fn().mockResolvedValue(existing),
    findById: jest.fn(),
    save: jest.fn().mockImplementation((t: any) => Promise.resolve({ ...t, id: t.id ?? 'new-id' })),
    delete: jest.fn(),
  };
  const propertyRepo = { findAll: jest.fn().mockResolvedValue([{ id: PROPERTY_ID, code: 'P1' }]) };
  const bedRepo = { findAll: jest.fn().mockResolvedValue([]) };
  const residentRepo = { findAll: jest.fn().mockResolvedValue(residents) };
  const useCase = new ImportDepositsUseCase(
    txRepo as any, propertyRepo as any, bedRepo as any, residentRepo as any,
  );
  return { txRepo, useCase };
}

describe('ImportDepositsUseCase', () => {
  afterEach(() => jest.clearAllMocks());

  it('inserts a row the DB does not have yet', async () => {
    parseDepositsMock.mockReturnValue([sheetRow()] as any);
    const { txRepo, useCase } = build([]);

    const result = await useCase.execute(Buffer.from(''));

    expect(result).toMatchObject({ imported: 1, updated: 0, skipped: 0 });
    const saved = txRepo.save.mock.calls[0][0];
    expect(saved.id).toBeUndefined();
    expect(saved.active).toBe(true);
    expect(saved.dateProcessed).toEqual(new Date(Date.UTC(2025, 11, 3)));
  });

  // The reason the stakeholder's processed dates stayed empty: a re-import of the
  // corrected sheet used to be dropped as a duplicate.
  it('backfills a processed date onto the existing row instead of skipping it', async () => {
    parseDepositsMock.mockReturnValue([sheetRow()] as any);
    const { txRepo, useCase } = build([existingTx]);

    const result = await useCase.execute(Buffer.from(''));

    expect(result).toMatchObject({ imported: 0, updated: 1, skipped: 0 });
    const saved = txRepo.save.mock.calls[0][0];
    expect(saved.id).toBe('tx-1');
    expect(saved.dateProcessed).toEqual(new Date(Date.UTC(2025, 11, 3)));
    expect(saved.status).toBe('done');
  });

  it('leaves fields the sheet does not carry untouched on an update', async () => {
    parseDepositsMock.mockReturnValue([sheetRow()] as any);
    const { txRepo, useCase } = build([existingTx]);

    await useCase.execute(Buffer.from(''));

    const saved = txRepo.save.mock.calls[0][0];
    for (const field of ['bookingId', 'refundDueDate', 'completedBy', 'completedByName', 'active', 'createdAt', 'updatedAt']) {
      expect(saved).not.toHaveProperty(field);
    }
  });

  it('does not unlink a resident whose name no longer matches', async () => {
    parseDepositsMock.mockReturnValue([sheetRow()] as any);
    // No resident matches the sheet's name, so the row is still updated but the
    // existing residentId is left alone (backfill-deposit-residents owns re-linking).
    const { txRepo, useCase } = build([existingTx], []);

    await useCase.execute(Buffer.from(''));

    const saved = txRepo.save.mock.calls[0][0];
    expect(saved).not.toHaveProperty('residentId');
  });

  it('collapses duplicate rows within one sheet onto the row it just created', async () => {
    parseDepositsMock.mockReturnValue([sheetRow(), sheetRow({ comments: 'second pass' })] as any);
    const { txRepo, useCase } = build([]);

    const result = await useCase.execute(Buffer.from(''));

    expect(result).toMatchObject({ imported: 1, updated: 1, skipped: 0 });
    expect(txRepo.save.mock.calls[1][0]).toMatchObject({ id: 'new-id', comments: 'second pass' });
  });

  it('still skips a row whose property code is unknown', async () => {
    parseDepositsMock.mockReturnValue([sheetRow({ propertyCode: 'NOPE' })] as any);
    const { txRepo, useCase } = build([]);

    const result = await useCase.execute(Buffer.from(''));

    expect(result).toMatchObject({ imported: 0, updated: 0, skipped: 1 });
    expect(result.skipReasons[0].reason).toContain('not found');
    expect(txRepo.save).not.toHaveBeenCalled();
  });
});
