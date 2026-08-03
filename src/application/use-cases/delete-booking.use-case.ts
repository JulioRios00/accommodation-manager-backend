import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';

@Injectable()
export class DeleteBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly repo: IBookingRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Booking ${id} not found`);
    await this.repo.delete(id);

    const remaining = await this.repo.findByBedId(existing.bedId);
    const hasActive = remaining.some((b) => b.id !== id && b.status === 'active');
    if (!hasActive) {
      await this.bedRepo.save({ id: existing.bedId, status: 'vacant' });
    }
  }
}
