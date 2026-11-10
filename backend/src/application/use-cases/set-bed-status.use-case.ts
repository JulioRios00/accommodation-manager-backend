import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Bed } from '../../domain/bed/bed.entity';
import { BED_REPOSITORY, IBedRepository } from '../../domain/bed/bed.repository';
import { BOOKING_REPOSITORY, IBookingRepository } from '../../domain/booking/booking.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';

/** What the caller is asking for, rather than the resulting status — a reactivated bed
 *  becomes `vacant` or `allocated` depending on who is in it, which is ours to work out. */
export type BedActivation = 'activate' | 'deactivate';

/** Outcome of a bulk run. Beds that were refused are listed individually: a bare
 *  "4 failed" sends someone hunting through the grid for which four. */
export interface BulkActivationResult {
  changed: number;
  /** Already in the requested state — not an error, and not worth a line each. */
  unchanged: number;
  failed: { id: string; reason: string }[];
}

/** Ceiling on one bulk request. Each bed is a few queries, so an unbounded list would
 *  hold a connection for as long as someone cared to make it. */
export const MAX_BULK_BEDS = 500;

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
    return (await this.change(id, action, actor)).bed;
  }

  /**
   * The same operation over many beds, carrying on past the ones it cannot do.
   *
   * A half-applied batch is the right outcome here: the beds that can be deactivated
   * should be, and the occupied ones are a list of bookings for someone to deal with —
   * not a reason to undo the rest. Sequential rather than parallel, so the audit log
   * reads in the order the user chose and the database sees one bed at a time.
   */
  async executeMany(ids: string[], action: BedActivation, actor?: Actor): Promise<BulkActivationResult> {
    if (ids.length > MAX_BULK_BEDS) {
      throw new BadRequestException(`Too many beds in one request (limit ${MAX_BULK_BEDS})`);
    }

    const result: BulkActivationResult = { changed: 0, unchanged: 0, failed: [] };
    // Duplicates in the request would otherwise be counted twice.
    for (const id of [...new Set(ids)]) {
      try {
        const { changed } = await this.change(id, action, actor);
        if (changed) result.changed++;
        else result.unchanged++;
      } catch (err: any) {
        result.failed.push({ id, reason: err?.message ?? 'Could not change this bed' });
      }
    }
    return result;
  }

  private async change(id: string, action: BedActivation, actor?: Actor): Promise<{ bed: Bed; changed: boolean }> {
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
      // Already inactive, but possibly only because the sheet said so. Deactivating it
      // by hand is a claim of ownership, so stamp the flag — otherwise the next import
      // would be free to put the bed back into stock.
      if (bed.status === 'inactive') {
        const owned = bed.statusSetManually ? bed : await this.apply(bed, 'inactive', actor);
        return { bed: owned, changed: false };
      }
      return { bed: await this.apply(bed, 'inactive', actor), changed: true };
    }

    if (bed.status !== 'inactive') return { bed, changed: false };
    // Back to whichever state the bookings say it is in. `inactive` is a third state, not
    // a flavour of vacant, so there is nothing to restore — it is recomputed.
    return { bed: await this.apply(bed, occupant ? 'allocated' : 'vacant', actor), changed: true };
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
