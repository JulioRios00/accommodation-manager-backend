import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';

@Injectable()
export class DeletePropertyUseCase {
  constructor(
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.propertyRepo.findById(id);
    if (!existing) throw new NotFoundException(`Property ${id} not found`);

    const beds = await this.bedRepo.findAll(id);
    for (const bed of beds) {
      await this.bookingRepo.deleteByBedId(bed.id);
    }
    await this.bedRepo.deleteByPropertyId(id);
    await this.propertyRepo.delete(id);
  }
}
