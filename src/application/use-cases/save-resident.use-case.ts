import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Resident } from '../../domain/resident/resident.entity';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';

export interface SaveResidentDto {
  id?: string;
  clerkUserId?: string | null;
  fullName: string;
  email?: string | null;
  telephone?: string | null;
  gender?: string | null;
  nationality?: string | null;
  personalId?: string | null;
  iban?: string | null;
  emergencyContact?: string | null;
  source?: string | null;
  paymentDueDay?: number | null;
  comments?: string | null;
  delinquent?: boolean;
  hasObservation?: boolean;
  observation?: string | null;
}

@Injectable()
export class SaveResidentUseCase {
  constructor(
    @Inject(RESIDENT_REPOSITORY) private readonly repo: IResidentRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(dto: SaveResidentDto, actor?: Actor): Promise<Resident> {
    let existing: Resident | null = null;
    if (dto.id) {
      existing = await this.repo.findById(dto.id);
      if (!existing) throw new NotFoundException(`Resident ${dto.id} not found`);
    }
    const resident = await this.repo.save(dto);

    await this.auditLog.record({
      actor,
      action: existing ? 'update' : 'create',
      entityType: 'Resident',
      entityId: resident.id,
      before: existing as unknown as Record<string, unknown>,
      after: resident as unknown as Record<string, unknown>,
    });

    return resident;
  }
}
