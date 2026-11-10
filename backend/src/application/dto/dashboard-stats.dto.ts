export class DashboardStatsDto {
  totalProperties: number;
  inactiveProperties: number;
  /** Lettable beds only — a deactivated bed is counted in `inactiveBeds` instead. */
  totalBeds: number;
  inactiveBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  onRadarBeds: number;
  occupancyRate: number;
  monthlyRevenue: number;
  projectedRevenue: number;
}
