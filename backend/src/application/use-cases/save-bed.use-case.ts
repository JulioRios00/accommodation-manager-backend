import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Bed } from '../../domain/bed/bed.entity';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { IBedroomRepository, BEDROOM_REPOSITORY } from '../../domain/bedroom/bedroom.repository';
import { IBedRateHistoryRepository, BED_RATE_HISTORY_REPOSITORY } from '../../domain/bed-rate-history/bed-rate-history.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';

export interface SaveBedDto {
  id?: string;
  propertyId: string;
  bedNumber: number;
  bedroomId?: string | null;
  name?: string | null;
  position?: number | null;
  status?: string;
  bedroomType: string;
  sex: string;
  bedSize: string;
  depositAmount?: number;
  rentAmount?: number;
}

@Injectable()
export class SaveBedUseCase {
  constructor(
    @Inject(BED_REPOSITORY) private readonly repo: IBedRepository,
    @Inject(BEDROOM_REPOSITORY) private readonly bedroomRepo: IBedroomRepository,
    @Inject(BED_RATE_HISTORY_REPOSITORY) private readonly rateHistoryRepo: IBedRateHistoryRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(dto: SaveBedDto, actor?: Actor): Promise<Bed> {
    if (dto.rentAmount !== undefined && dto.rentAmount < 0) {
      throw new BadRequestException('rentAmount must be >= 0');
    }
    if (dto.depositAmount !== undefined && dto.depositAmount < 0) {
      throw new BadRequestException('depositAmount must be >= 0');
    }
    if (dto.bedroomId) {
      const bedroom = await this.bedroomRepo.findById(dto.bedroomId);
      if (!bedroom) throw new NotFoundException(`Bedroom ${dto.bedroomId} not found`);
      if (bedroom.propertyId !== dto.propertyId) {
        throw new BadRequestException('Bedroom does not belong to this property');
      }
    }

    let existing: Bed | null = null;
    let bed: Bed;
    if (dto.id) {
      existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`Bed ${dto.id} not found`);
      bed = await this.repo.save(dto as any);
    } else {
      bed = await this.repo.save({ ...dto, status: 'vacant' } as any);
    }

    // Rent/deposit changed (or this is a brand-new bed) — snapshot it so past rates stay
    // recoverable, e.g. for reports that need to show what was charged as of a given date.
    const rateChanged = !existing || existing.rentAmount !== bed.rentAmount || existing.depositAmount !== bed.depositAmount;
    if (rateChanged) {
      await this.rateHistoryRepo.save({
        bedId: bed.id,
        rentAmount: bed.rentAmount,
        depositAmount: bed.depositAmount,
        effectiveFrom: new Date(),
      });
    }

    await this.auditLog.record({
      actor,
      action: existing ? 'update' : 'create',
      entityType: 'Bed',
      entityId: bed.id,
      before: existing as unknown as Record<string, unknown>,
      after: bed as unknown as Record<string, unknown>,
    });

    return bed;
  }
}
