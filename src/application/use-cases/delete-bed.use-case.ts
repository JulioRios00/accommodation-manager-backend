import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';

@Injectable()
export class DeleteBedUseCase {
  constructor(
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.bedRepo.findById(id);
    if (!existing) throw new NotFoundException(`Bed ${id} not found`);
    await this.bookingRepo.deleteByBedId(id);
    await this.bedRepo.delete(id);
  }
}
