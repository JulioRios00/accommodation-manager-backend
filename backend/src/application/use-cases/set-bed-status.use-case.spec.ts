import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SetBedStatusUseCase } from './set-bed-status.use-case';

const bed = (over: Record<string, unknown> = {}) => ({
  id: 'bed-1', propertyId: 'prop-1', bedNumber: 1, status: 'vacant', statusSetManually: false, ...over,
});

function build(opts: { bed?: Record<string, unknown> | null; bookings?: any[] } = {}) {
  const saved: any[] = [];
  const bedRepo: any = {
    findById: jest.fn(async () => (opts.bed === null ? null : bed(opts.bed))),
    save: jest.fn(async (b: any) => { saved.push(b); return { ...bed(opts.bed), ...b }; }),
  };
  const bookingRepo: any = { findByBedId: jest.fn(async () => opts.bookings ?? []) };
  const auditLog: any = { record: jest.fn(async () => undefined) };
  return { useCase: new SetBedStatusUseCase(bedRepo, bookingRepo, auditLog), saved, auditLog, bedRepo };
}

const occupied = [{ status: 'active', resident: { fullName: 'Ana Silva' } }];

describe('SetBedStatusUseCase', () => {
  it('deactivates an empty bed and marks the status as manually owned', async () => {
    const { useCase, saved } = build();
    const res = await useCase.execute('bed-1', 'deactivate');
    expect(res.status).toBe('inactive');
    // The flag is the whole point: it is what stops the next import undoing this.
    expect(saved[0]).toEqual({ id: 'bed-1', status: 'inactive', statusSetManually: true });
  });

  // A resident in a bed the system says is not lettable would vanish from every
  // vacancy count. Moving them is a decision about a person, not about the bed.
  it('refuses to deactivate an occupied bed and names the resident', async () => {
    const { useCase, saved } = build({ bookings: occupied });
    await expect(useCase.execute('bed-1', 'deactivate')).rejects.toThrow(/Ana Silva/);
    await expect(useCase.execute('bed-1', 'deactivate')).rejects.toBeInstanceOf(BadRequestException);
    expect(saved).toHaveLength(0);
  });

  it('reactivates an empty bed as vacant', async () => {
    const { useCase, saved } = build({ bed: { status: 'inactive', statusSetManually: true } });
    const res = await useCase.execute('bed-1', 'activate');
    expect(res.status).toBe('vacant');
    expect(saved[0].statusSetManually).toBe(true);
  });

  // inactive is a third state, not a flavour of vacant, so there is nothing to restore —
  // the status is recomputed from who is actually in the bed.
  it('reactivates an occupied bed as allocated', async () => {
    const { useCase } = build({ bed: { status: 'inactive' }, bookings: occupied });
    expect((await useCase.execute('bed-1', 'activate')).status).toBe('allocated');
  });

  it('leaves an already-correct bed alone instead of writing to it', async () => {
    const already = build({ bed: { status: 'inactive' } });
    await already.useCase.execute('bed-1', 'deactivate');
    expect(already.saved).toHaveLength(0);

    const lettable = build({ bed: { status: 'allocated' }, bookings: occupied });
    await lettable.useCase.execute('bed-1', 'activate');
    expect(lettable.saved).toHaveLength(0);
  });

  it('records who changed it', async () => {
    const { useCase, auditLog } = build();
    await useCase.execute('bed-1', 'deactivate', { userId: 'user_1', role: 'manager' });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update',
        entityType: 'Bed',
        entityId: 'bed-1',
        after: { status: 'inactive', statusSetManually: true },
      }),
    );
  });

  describe('in bulk', () => {
    /** Beds keyed by id, so one run can mix empty, occupied and already-inactive. */
    function buildMany(byId: Record<string, { status: string; occupied?: boolean }>) {
      const saved: any[] = [];
      const bedRepo: any = {
        findById: jest.fn(async (id: string) => (byId[id] ? bed({ id, status: byId[id].status }) : null)),
        save: jest.fn(async (b: any) => { saved.push(b); return { ...bed(b), ...b }; }),
      };
      const bookingRepo: any = {
        findByBedId: jest.fn(async (id: string) => (byId[id]?.occupied ? occupied : [])),
      };
      const auditLog: any = { record: jest.fn(async () => undefined) };
      return { useCase: new SetBedStatusUseCase(bedRepo, bookingRepo, auditLog), saved };
    }

    // A half-applied batch is the right outcome: the beds that can be deactivated should
    // be, and the occupied one is a booking for someone to deal with — not a reason to
    // undo the rest.
    it('carries on past the beds it cannot change and reports each one', async () => {
      const { useCase, saved } = buildMany({
        'bed-a': { status: 'vacant' },
        'bed-b': { status: 'allocated', occupied: true },
        'bed-c': { status: 'inactive' },
        'bed-d': { status: 'vacant' },
      });
      const res = await useCase.executeMany(['bed-a', 'bed-b', 'bed-c', 'bed-d', 'bed-missing'], 'deactivate');

      expect(res.changed).toBe(2);
      expect(res.unchanged).toBe(1);
      expect(res.failed.map(f => f.id)).toEqual(['bed-b', 'bed-missing']);
      expect(res.failed[0].reason).toContain('Ana Silva');
      expect(saved.map(b => b.id)).toEqual(['bed-a', 'bed-d']);
    });

    it('counts a repeated id once', async () => {
      const { useCase, saved } = buildMany({ 'bed-a': { status: 'vacant' } });
      const res = await useCase.executeMany(['bed-a', 'bed-a', 'bed-a'], 'deactivate');
      expect(res).toMatchObject({ changed: 1, unchanged: 0 });
      expect(saved).toHaveLength(1);
    });

    it('refuses a batch larger than the limit rather than holding a connection open', async () => {
      const { useCase, saved } = buildMany({});
      const tooMany = Array.from({ length: 501 }, (_, i) => `bed-${i}`);
      await expect(useCase.executeMany(tooMany, 'deactivate')).rejects.toBeInstanceOf(BadRequestException);
      expect(saved).toHaveLength(0);
    });

    it('reactivates a mixed selection to the state each bed is actually in', async () => {
      const { useCase, saved } = buildMany({
        'bed-a': { status: 'inactive' },
        'bed-b': { status: 'inactive', occupied: true },
      });
      const res = await useCase.executeMany(['bed-a', 'bed-b'], 'activate');
      expect(res.changed).toBe(2);
      expect(saved.map(b => b.status)).toEqual(['vacant', 'allocated']);
    });
  });

  it('404s on a bed that does not exist', async () => {
    const { useCase } = build({ bed: null });
    await expect(useCase.execute('nope', 'deactivate')).rejects.toBeInstanceOf(NotFoundException);
  });
});
