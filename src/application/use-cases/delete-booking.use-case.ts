import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';

@Injectable()
export class DeleteBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly repo: IBookingRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(id: string, actor?: Actor): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Booking ${id} not found`);
    await this.repo.delete(id);

    const remaining = await this.repo.findByBedId(existing.bedId);
    const hasActive = remaining.some((b) => b.id !== id && b.status === 'active');
    if (!hasActive) {
      await this.bedRepo.save({ id: existing.bedId, status: 'vacant' });
    }

    await this.auditLog.record({
      actor,
      action: 'delete',
      entityType: 'Booking',
      entityId: id,
      before: existing as unknown as Record<string, unknown>,
    });
  }
}
