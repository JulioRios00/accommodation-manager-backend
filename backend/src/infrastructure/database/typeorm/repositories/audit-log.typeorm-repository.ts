import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DeepPartial, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AuditLog } from '../../../../domain/audit-log/audit-log.entity';
import { AuditLogFilter, IAuditLogRepository } from '../../../../domain/audit-log/audit-log.repository';
import { AuditLogOrmEntity } from '../entities/audit-log.orm-entity';

@Injectable()
export class AuditLogTypeOrmRepository implements IAuditLogRepository {
  constructor(@InjectRepository(AuditLogOrmEntity) private readonly repo: Repository<AuditLogOrmEntity>) {}

  async save(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const e = this.repo.create(entry as DeepPartial<AuditLogOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  async findAll(filter?: AuditLogFilter): Promise<AuditLog[]> {
    const where: Record<string, unknown> = {};
    if (filter?.userId) where.userId = filter.userId;
    if (filter?.entityType) where.entityType = filter.entityType;
    if (filter?.entityId) where.entityId = filter.entityId;
    if (filter?.dateFrom && filter?.dateTo) {
      where.createdAt = Between(new Date(filter.dateFrom), new Date(`${filter.dateTo}T23:59:59.999`));
    } else if (filter?.dateFrom) {
      where.createdAt = MoreThanOrEqual(new Date(filter.dateFrom));
    } else if (filter?.dateTo) {
      where.createdAt = LessThanOrEqual(new Date(`${filter.dateTo}T23:59:59.999`));
    }
    const entities = await this.repo.find({ where, order: { createdAt: 'DESC' }, take: 500 });
    return entities.map(this.toDomain);
  }

  private toDomain(e: AuditLogOrmEntity): AuditLog {
    const d = new AuditLog();
    d.id = e.id;
    d.userId = e.userId;
    d.userRole = e.userRole ?? null;
    d.action = e.action;
    d.entityType = e.entityType;
    d.entityId = e.entityId;
    d.changes = e.changes ?? [];
    d.createdAt = e.createdAt;
    return d;
  }
}
