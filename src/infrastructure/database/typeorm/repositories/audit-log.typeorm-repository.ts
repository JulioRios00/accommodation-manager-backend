import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { AuditLog } from '../../../../domain/audit-log/audit-log.entity';
import { IAuditLogRepository } from '../../../../domain/audit-log/audit-log.repository';
import { AuditLogOrmEntity } from '../entities/audit-log.orm-entity';

@Injectable()
export class AuditLogTypeOrmRepository implements IAuditLogRepository {
  constructor(@InjectRepository(AuditLogOrmEntity) private readonly repo: Repository<AuditLogOrmEntity>) {}

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return (await this.repo.find({ where: { entityType, entityId }, order: { createdAt: 'DESC' } })).map(e => {
      const d = new AuditLog();
      d.id = e.id; d.entityType = e.entityType; d.entityId = e.entityId;
      d.field = e.field ?? null; d.oldValue = e.oldValue ?? null; d.newValue = e.newValue ?? null;
      d.clerkUserId = e.clerkUserId ?? null; d.clerkUserName = e.clerkUserName ?? null;
      d.createdAt = e.createdAt;
      return d;
    });
  }

  async saveMany(logs: Partial<AuditLog>[]): Promise<void> {
    const entities = logs.map(l => this.repo.create(l as DeepPartial<AuditLogOrmEntity>));
    await this.repo.save(entities);
  }
}
