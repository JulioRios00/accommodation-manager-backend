import { GetDashboardStatsUseCase } from './get-dashboard-stats.use-case';

const bed = (id: string, status = 'vacant') => ({ id, propertyId: 'prop-1', bedNumber: 1, status });

function build(beds: any[], activeBookings: any[] = []) {
  const propertyRepo: any = { findAll: jest.fn(async () => [{ id: 'prop-1', active: true }]) };
  const bedRepo: any = { findAll: jest.fn(async () => beds) };
  const bookingRepo: any = {
    findAll: jest.fn(async (status: string) => (status === 'active' ? activeBookings : [])),
  };
  return new GetDashboardStatsUseCase(propertyRepo, bedRepo, bookingRepo);
}

describe('GetDashboardStatsUseCase', () => {
  // A deactivated bed in the denominator makes occupancy read lower than the business is
  // actually running at — it is stock that was deliberately taken off the market.
  it('leaves inactive beds out of the occupancy calculation', async () => {
    const useCase = build(
      [bed('bed-1'), bed('bed-2'), bed('bed-3', 'inactive'), bed('bed-4', 'inactive')],
      [{ bedId: 'bed-1' }],
    );
    const stats = await useCase.execute();

    expect(stats).toMatchObject({
      totalBeds: 2,
      inactiveBeds: 2,
      occupiedBeds: 1,
      availableBeds: 1,
      occupancyRate: 50,
    });
  });

  // The importer can leave a Z bed inactive while a booking still points at it. Counting
  // that booking would put occupancy above the lettable stock it is measured against.
  it('ignores a booking that points at an inactive bed', async () => {
    const useCase = build([bed('bed-1'), bed('bed-2', 'inactive')], [{ bedId: 'bed-2' }]);
    expect(await useCase.execute()).toMatchObject({
      totalBeds: 1, occupiedBeds: 0, availableBeds: 1, occupancyRate: 0,
    });
  });

  it('reports 0% rather than dividing by zero when nothing is lettable', async () => {
    const useCase = build([bed('bed-1', 'inactive')]);
    expect(await useCase.execute()).toMatchObject({ totalBeds: 0, occupancyRate: 0 });
  });
});
