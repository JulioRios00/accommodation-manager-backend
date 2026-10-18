import { AuditLogContextService } from './audit-log-context.service';
import { AuditLog } from '../../domain/audit-log/audit-log.entity';

const RESIDENT = { id: 'res-1', fullName: 'Ana Silva' };
const PROPERTY = { id: 'prop-1', code: '136SV' };
const BED = { id: 'bed-1', propertyId: 'prop-1', bedNumber: 5, bedroomName: 'Bedroom C' };

const log = (over: Partial<AuditLog> = {}): AuditLog =>
  ({
    id: 'log-1', userId: 'u1', userRole: 'staff', action: 'update',
    entityType: 'RentPayment', entityId: 'rp-1', changes: [], createdAt: new Date(),
    ...over,
  }) as AuditLog;

function build(over: Record<string, any> = {}) {
  const repos = {
    rentPayments: { findById: jest.fn().mockResolvedValue({ id: 'rp-1', residentId: 'res-1', propertyId: 'prop-1', bookingId: 'bk-1', month: '2026-10' }) },
    bookings: { findById: jest.fn().mockResolvedValue({ id: 'bk-1', residentId: 'res-1', bedId: 'bed-1' }) },
    residents: { findAll: jest.fn().mockResolvedValue([RESIDENT]) },
    properties: { findAll: jest.fn().mockResolvedValue([PROPERTY]) },
    beds: { findAll: jest.fn().mockResolvedValue([BED]) },
    landlordPayments: { findById: jest.fn().mockResolvedValue({ id: 'lp-1', propertyId: 'prop-1', landlordId: 'll-1', month: '2026-09' }) },
    deposits: { findById: jest.fn().mockResolvedValue({ id: 'dt-1', residentName: 'Ana Silva', propertyId: 'prop-1', bedId: 'bed-1', residentId: 'res-1', type: 'refund' }) },
    ...over,
  };
  const service = new AuditLogContextService(
    repos.rentPayments as any, repos.bookings as any, repos.residents as any,
    repos.properties as any, repos.beds as any, repos.landlordPayments as any, repos.deposits as any,
  );
  return { repos, service };
}

describe('AuditLogContextService', () => {
  it('returns an empty list untouched', async () => {
    const { repos, service } = build();
    expect(await service.enrich([])).toEqual([]);
    expect(repos.residents.findAll).not.toHaveBeenCalled();
  });

  it('labels a rent payment with resident, property and month', async () => {
    const { service } = build();
    const [out] = await service.enrich([log()]);
    expect(out.entityLabel).toBe('Ana Silva — 136SV — 2026-10');
    expect(out.entityLinks).toEqual({ residentId: 'res-1', propertyId: 'prop-1', bookingId: 'bk-1' });
  });

  it('labels a landlord payment with property and month', async () => {
    const { service } = build();
    const [out] = await service.enrich([log({ entityType: 'LandlordPayment', entityId: 'lp-1' })]);
    expect(out.entityLabel).toBe('136SV — 2026-09');
  });

  it('labels a booking with resident and bed code', async () => {
    const { service } = build();
    const [out] = await service.enrich([log({ entityType: 'Booking', entityId: 'bk-1' })]);
    expect(out.entityLabel).toBe('Ana Silva — 136SV-C5');
  });

  it('labels residents, properties and beds from the shared maps', async () => {
    const { service } = build();
    const out = await service.enrich([
      log({ entityType: 'Resident', entityId: 'res-1' }),
      log({ entityType: 'Property', entityId: 'prop-1' }),
      log({ entityType: 'Bed', entityId: 'bed-1' }),
    ]);
    expect(out.map(o => o.entityLabel)).toEqual(['Ana Silva', '136SV', '136SV-C5']);
  });

  it('labels a deposit transaction', async () => {
    const { service } = build();
    const [out] = await service.enrich([log({ entityType: 'DepositTransaction', entityId: 'dt-1' })]);
    expect(out.entityLabel).toBe('Ana Silva — 136SV — refund');
  });

  // A deleted record must not hide its own history.
  it('falls back to null when the record no longer exists', async () => {
    const { service } = build({ rentPayments: { findById: jest.fn().mockResolvedValue(null) } });
    const [out] = await service.enrich([log()]);
    expect(out.entityLabel).toBeNull();
    expect(out.entityLinks).toEqual({});
    expect(out.entityId).toBe('rp-1');
  });

  it('resolves each referenced record once, however many times it was edited', async () => {
    const { repos, service } = build();
    await service.enrich([log({ id: 'a' }), log({ id: 'b' }), log({ id: 'c' })]);
    expect(repos.rentPayments.findById).toHaveBeenCalledTimes(1);
  });

  it('gives no label for an unknown entity type rather than guessing', async () => {
    const { service } = build();
    const [out] = await service.enrich([log({ entityType: 'CustomReport', entityId: 'cr-1' })]);
    expect(out.entityLabel).toBeNull();
  });

  it('still returns the logs when a lookup throws', async () => {
    const { service } = build({ residents: { findAll: jest.fn().mockRejectedValue(new Error('db down')) } });
    const out = await service.enrich([log()]);
    expect(out).toHaveLength(1);
    expect(out[0].entityLabel).toBeNull();
    expect(out[0].id).toBe('log-1');
  });

  it('survives one record failing to resolve without losing the others', async () => {
    const { service } = build({ rentPayments: { findById: jest.fn().mockRejectedValue(new Error('boom')) } });
    const out = await service.enrich([log(), log({ id: 'log-2', entityType: 'Property', entityId: 'prop-1' })]);
    expect(out[0].entityLabel).toBeNull();
    expect(out[1].entityLabel).toBe('136SV');
  });

  it('preserves the original log fields', async () => {
    const { service } = build();
    const changes = [{ field: 'status', before: 'unpaid', after: 'paid' }];
    const [out] = await service.enrich([log({ changes })]);
    expect(out.changes).toEqual(changes);
    expect(out.userId).toBe('u1');
    expect(out.action).toBe('update');
  });
});
