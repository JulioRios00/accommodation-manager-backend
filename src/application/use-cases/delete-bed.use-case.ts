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
    console.log(`[DeleteBedUseCase] execute(${id})`);
    const existing = await this.bedRepo.findById(id);
    console.log(`[DeleteBedUseCase] findById result:`, existing ? 'found' : 'not found');
    if (!existing) throw new NotFoundException(`Bed ${id} not found`);
    console.log(`[DeleteBedUseCase] deleting bookings for bed ${id}`);
    await this.bookingRepo.deleteByBedId(id);
    console.log(`[DeleteBedUseCase] bookings deleted, deleting bed ${id}`);
    await this.bedRepo.delete(id);
    console.log(`[DeleteBedUseCase] bed ${id} deleted`);
  }
}
