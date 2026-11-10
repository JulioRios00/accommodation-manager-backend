import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Bed } from '../../domain/bed/bed.entity';
import { BED_REPOSITORY, IBedRepository } from '../../domain/bed/bed.repository';
import { BOOKING_REPOSITORY, IBookingRepository } from '../../domain/booking/booking.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';

/** What the caller is asking for, rather than the resulting status — a reactivated bed
 *  becomes `vacant` or `allocated` depending on who is in it, which is ours to work out. */
export type BedActivation = 'activate' | 'deactivate';

/**
 * Takes a bed out of lettable stock, or puts it back.
 *
 * Status is otherwise set by the importer from the Z bedroom convention. Doing it by hand
 * marks the bed so the importer stops overwriting it: after the initial load the system is
 * the record, and a spreadsheet that still lists the bed as A1 must not quietly re-let
 * something taken out of service here.
 */
@Injectable()
export class SetBedStatusUseCase {
  constructor(
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(id: string, action: BedActivation, actor?: Actor): Promise<Bed> {
    const bed = await this.bedRepo.findById(id);
    if (!bed) throw new NotFoundException(`Bed ${id} not found`);

    const occupant = await this.currentOccupant(id);

    if (action === 'deactivate') {
      // Deactivating an occupied bed would leave a resident in a bed the system says is
      // not lettable, and hide them from every vacancy count. Move or check them out
      // first — that is a decision about a person, not about the bed.
      if (occupant) {
        throw new BadRequestException(
          `This bed is occupied by ${occupant}. End or move the booking before deactivating the bed.`,
        );
      }
      if (bed.status === 'inactive') return bed;
      return this.apply(bed, 'inactive', actor);
    }

    if (bed.status !== 'inactive') return bed;
    // Back to whichever state the bookings say it is in. `inactive` is a third state, not
    // a flavour of vacant, so there is nothing to restore — it is recomputed.
    return this.apply(bed, occupant ? 'allocated' : 'vacant', actor);
  }

  /** The name of the resident currently in the bed, or null if it is empty. */
  private async currentOccupant(bedId: string): Promise<string | null> {
    const bookings = await this.bookingRepo.findByBedId(bedId);
    const active = bookings.find(b => b.status === 'active');
    return active ? (active.resident?.fullName ?? 'a resident') : null;
  }

  private async apply(bed: Bed, status: Bed['status'], actor?: Actor): Promise<Bed> {
    const saved = await this.bedRepo.save({ id: bed.id, status, statusSetManually: true });

    await this.auditLog.record({
      actor,
      action: 'update',
      entityType: 'Bed',
      entityId: bed.id,
      before: { status: bed.status, statusSetManually: bed.statusSetManually },
      after: { status: saved.status, statusSetManually: true },
    });

    return saved;
  }
}
