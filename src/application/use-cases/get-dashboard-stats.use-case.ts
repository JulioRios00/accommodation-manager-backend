import { Inject, Injectable } from '@nestjs/common';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { DashboardStatsDto } from '../dto/dashboard-stats.dto';

@Injectable()
export class GetDashboardStatsUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
  ) {}

  async execute(): Promise<DashboardStatsDto> {
    const [properties, beds, activeBookings, upcomingBookings] = await Promise.all([
      this.propertyRepo.findAll(),
      this.bedRepo.findAll(),
      this.bookingRepo.findAll('active'),
      this.bookingRepo.findAll('upcoming'),
    ]);

    const occupiedBedIds = new Set(activeBookings.map((b) => b.bedId));
    const occupiedBeds = occupiedBedIds.size;
    const availableBeds = beds.length - occupiedBeds;

    const today = Date.now();

    // TypeORM returns Postgres `date` columns as plain 'YYYY-MM-DD' strings, not Date
    // objects, so contractEndDate must be re-parsed here rather than compared directly.
    const onRadarBeds = activeBookings.filter((b) => {
      if (!b.contractEndDate) return false;
      const daysUntilEnd = (new Date(b.contractEndDate).getTime() - today) / 86400000;
      return daysUntilEnd >= 0 && daysUntilEnd <= 38;
    }).length;

    const totalBeds = beds.length;
    const occupancyRate = totalBeds > 0
      ? Math.round((occupiedBeds / totalBeds) * 1000) / 10
      : 0;

    const monthlyRevenue = activeBookings.reduce((sum, b) => sum + (b.rentAmount ?? 0), 0);

    const upcomingRevenue = upcomingBookings.reduce((sum, b) => sum + (b.rentAmount ?? 0), 0);
    const projectedRevenue = monthlyRevenue + upcomingRevenue;

    return {
      totalProperties: properties.length,
      totalBeds,
      occupiedBeds,
      availableBeds,
      onRadarBeds,
      occupancyRate,
      monthlyRevenue,
      projectedRevenue,
    };
  }
}
