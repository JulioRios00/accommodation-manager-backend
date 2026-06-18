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
    const [properties, beds, activeBookings] = await Promise.all([
      this.propertyRepo.findAll(),
      this.bedRepo.findAll(),
      this.bookingRepo.findAll('active'),
    ]);

    const occupiedBedIds = new Set(activeBookings.map((b) => b.bedId));
    const occupiedBeds = occupiedBedIds.size;
    const availableBeds = beds.length - occupiedBeds;

    const today = new Date();
    const thirtyEightDaysFromNow = new Date(today);
    thirtyEightDaysFromNow.setDate(today.getDate() + 38);

    const onRadarBeds = activeBookings.filter((b) => {
      const endDate = b.checkOutDate || b.contractEndDate;
      return endDate && endDate <= thirtyEightDaysFromNow;
    }).length;

    return {
      totalProperties: properties.length,
      totalBeds: beds.length,
      occupiedBeds,
      availableBeds,
      onRadarBeds,
    };
  }
}
