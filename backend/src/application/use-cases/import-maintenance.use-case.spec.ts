import { ImportMaintenanceUseCase } from './import-maintenance.use-case';
import * as parser from '../../infrastructure/parsers/maintenance.parser';

jest.mock('../../infrastructure/parsers/maintenance.parser');

const row = (over: Record<string, unknown> = {}) => ({
  propertyCode: '04SH', orderNumber: 'STA-004', descriptionRequested: 'Leaking tap',
  workItems: null, additionalDetails: null, status: 'Open', priority: 'Normal', ...over,
});

function build(properties: any[]) {
  const saved: any[] = [];
  const ticketRepo: any = {
    findAll: jest.fn(async () => []),
    save: jest.fn(async (t: any) => { saved.push(t); return t; }),
  };
  // The real repository excludes out-of-lease properties unless asked for them, so the
  // double has to honour the flag or the test would pass for the wrong reason.
  const propertyRepo: any = {
    findAll: jest.fn(async (includeInactive = false) =>
      includeInactive ? properties : properties.filter(p => p.active)),
  };
  return { useCase: new ImportMaintenanceUseCase(ticketRepo, propertyRepo), saved, propertyRepo };
}

describe('ImportMaintenanceUseCase', () => {
  // 129 of 841 tickets were skipped as "property not found" because their property's
  // lease had ended. The tickets are real and still belong to that property.
  it('imports a ticket for a property that is out of lease', async () => {
    (parser.parseMaintenance as jest.Mock).mockReturnValue([row()]);
    const { useCase, saved, propertyRepo } = build([{ id: 'prop-1', code: '04SH', active: false }]);

    const res = await useCase.execute(Buffer.from(''));

    expect(propertyRepo.findAll).toHaveBeenCalledWith(true);
    expect(res).toMatchObject({ imported: 1, skipped: 0 });
    expect(saved[0]).toMatchObject({ propertyId: 'prop-1', orderNumber: 'STA-004' });
  });

  it('still reports a code that matches no property at all', async () => {
    (parser.parseMaintenance as jest.Mock).mockReturnValue([row({ propertyCode: '999ZZ' })]);
    const { useCase } = build([{ id: 'prop-1', code: '04SH', active: false }]);

    const res = await useCase.execute(Buffer.from(''));

    expect(res).toMatchObject({ imported: 0, skipped: 1 });
    expect(res.skipReasons[0].reason).toContain('999ZZ');
  });
});
