import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { Actor, AuditLogService } from '../services/audit-log.service';

@Injectable()
export class DeleteResidentUseCase {
  constructor(
    @Inject(RESIDENT_REPOSITORY) private readonly repo: IResidentRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(id: string, actor?: Actor): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Resident ${id} not found`);
    await this.repo.delete(id);

    await this.auditLog.record({
      actor,
      action: 'delete',
      entityType: 'Resident',
      entityId: id,
      before: existing as unknown as Record<string, unknown>,
    });
  }
}
