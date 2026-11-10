import { GetBedsUseCase } from './get-beds.use-case';

const bed = (over: Record<string, unknown> = {}) => ({
  id: 'bed-1', propertyId: 'prop-1', bedNumber: 1, status: 'vacant', statusSetManually: false, ...over,
});

function build(beds: any[], bookings: any[] = []) {
  const bedRepo: any = { findAll: jest.fn(async () => beds) };
  const bookingRepo: any = { findAll: jest.fn(async () => bookings) };
  return new GetBedsUseCase(bedRepo, bookingRepo);
}

describe('GetBedsUseCase', () => {
  it('derives occupancy from the live bookings', async () => {
    const useCase = build(
      [bed({ id: 'bed-1' }), bed({ id: 'bed-2', status: 'allocated' })],
      [{ id: 'booking-1', bedId: 'bed-1' }],
    );
    const res = await useCase.execute();
    expect(res.map(b => b.status)).toEqual(['allocated', 'vacant']);
    expect(res[0].activeBooking).toMatchObject({ id: 'booking-1' });
  });

  // Deactivating a bed was invisible on the Beds page until this: the derived status
  // overwrote it on every load, so the Inactive card stayed at zero.
  it('keeps an inactive bed inactive instead of recomputing it as lettable', async () => {
    const useCase = build([bed({ status: 'inactive' })]);
    expect((await useCase.execute())[0].status).toBe('inactive');
  });

  it('keeps an inactive bed inactive even when someone is still in it', async () => {
    const useCase = build([bed({ status: 'inactive' })], [{ id: 'booking-1', bedId: 'bed-1' }]);
    const [res] = await useCase.execute();
    expect(res.status).toBe('inactive');
    // The booking is still reported — the resident must not disappear with the bed.
    expect(res.activeBooking).toMatchObject({ id: 'booking-1' });
  });
});
