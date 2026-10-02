import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { ErrorLog } from '../../../../domain/error-log/error-log.entity';
import { IErrorLogRepository } from '../../../../domain/error-log/error-log.repository';
import { ErrorLogOrmEntity } from '../entities/error-log.orm-entity';

@Injectable()
export class ErrorLogTypeOrmRepository implements IErrorLogRepository {
  constructor(@InjectRepository(ErrorLogOrmEntity) private readonly repo: Repository<ErrorLogOrmEntity>) {}

  async logError(error: Partial<ErrorLog>): Promise<ErrorLog> {
    const messageHash = `${error.message}-${error.context}`;
    const existing = await this.repo.findOne({
      where: { message: error.message, context: error.context, resolved: false },
      order: { lastOccurred: 'DESC' },
    });

    if (existing) {
      existing.count += 1;
      existing.lastOccurred = new Date();
      return this.toDomain(await this.repo.save(existing));
    }

    const e = this.repo.create({
      id: uuid(),
      message: error.message,
      stack: error.stack || null,
      severity: error.severity || 'error',
      context: error.context,
      userId: error.userId || null,
      userName: error.userName || null,
      statusCode: error.statusCode || null,
      url: error.url || null,
      method: error.method || null,
      count: 1,
      lastOccurred: new Date(),
    });
    return this.toDomain(await this.repo.save(e));
  }

  async findById(id: string): Promise<ErrorLog | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.toDomain(e) : null;
  }

  async findUnresolved(limit = 25, offset = 0): Promise<{ items: ErrorLog[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      where: { resolved: false },
      order: { lastOccurred: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items: items.map(e => this.toDomain(e)), total };
  }

  async findAll(limit = 25, offset = 0): Promise<{ items: ErrorLog[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      order: { lastOccurred: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { items: items.map(e => this.toDomain(e)), total };
  }

  async search(query: string, limit = 10): Promise<ErrorLog[]> {
    const items = await this.repo
      .createQueryBuilder('el')
      .where('el.message ILIKE :q OR el.context ILIKE :q OR el.stack ILIKE :q', { q: `%${query}%` })
      .orderBy('el.lastOccurred', 'DESC')
      .take(limit)
      .getMany();
    return items.map(e => this.toDomain(e));
  }

  async resolve(id: string, resolvedBy: string, notes?: string): Promise<ErrorLog> {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new Error('Error log not found');
    e.resolved = true;
    e.resolvedAt = new Date();
    e.resolvedBy = resolvedBy;
    e.notes = notes || null;
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  private toDomain(e: ErrorLogOrmEntity): ErrorLog {
    const d = new ErrorLog();
    d.id = e.id;
    d.message = e.message;
    d.stack = e.stack;
    d.severity = e.severity;
    d.context = e.context;
    d.userId = e.userId;
    d.userName = e.userName;
    d.statusCode = e.statusCode;
    d.url = e.url;
    d.method = e.method;
    d.resolved = e.resolved;
    d.resolvedAt = e.resolvedAt;
    d.resolvedBy = e.resolvedBy;
    d.notes = e.notes;
    d.count = e.count;
    d.lastOccurred = e.lastOccurred;
    d.createdAt = e.createdAt;
    d.updatedAt = e.updatedAt;
    return d;
  }
}
