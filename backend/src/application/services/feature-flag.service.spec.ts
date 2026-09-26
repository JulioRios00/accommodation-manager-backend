import { BadRequestException } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlag } from '../../domain/feature-flag/feature-flag.entity';

function makeFlag(key: string, enabled: boolean): FeatureFlag {
  const f = new FeatureFlag();
  Object.assign(f, { key, enabled, updatedAt: new Date() });
  return f;
}

describe('FeatureFlagService', () => {
  let repo: any;
  let service: FeatureFlagService;

  beforeEach(() => {
    repo = {
      findAll: jest.fn(async () => []),
      findByKey: jest.fn(async () => null),
      setEnabled: jest.fn(async (key: string, enabled: boolean) => makeFlag(key, enabled)),
    };
    service = new FeatureFlagService(repo);
  });

  it('defaults to enabled when a flag has never been toggled (no stored row)', async () => {
    expect(await service.isEnabled('receivables_ledger')).toBe(true);
  });

  it('respects a stored disabled row', async () => {
    repo.findByKey.mockResolvedValue(makeFlag('receivables_ledger', false));
    expect(await service.isEnabled('receivables_ledger')).toBe(false);
  });

  it('lists all known flags even when none have been stored yet', async () => {
    const all = await service.listAll();
    expect(all.map((f) => f.key).sort()).toEqual(['landlord_disbursements', 'overdue_escalation', 'receivables_ledger'].sort());
    expect(all.every((f) => f.enabled)).toBe(true);
  });

  it('merges a stored override into listAll', async () => {
    repo.findAll.mockResolvedValue([makeFlag('overdue_escalation', false)]);
    const all = await service.listAll();
    expect(all.find((f) => f.key === 'overdue_escalation')?.enabled).toBe(false);
    expect(all.find((f) => f.key === 'receivables_ledger')?.enabled).toBe(true);
  });

  it('rejects toggling an unknown flag key', async () => {
    await expect(service.setEnabled('not_a_real_flag', false)).rejects.toThrow(BadRequestException);
    expect(repo.setEnabled).not.toHaveBeenCalled();
  });

  it('toggles a known flag', async () => {
    const result = await service.setEnabled('landlord_disbursements', false);
    expect(repo.setEnabled).toHaveBeenCalledWith('landlord_disbursements', false);
    expect(result.enabled).toBe(false);
    expect(result.label).toBe('Landlord Disbursements');
  });
});
