import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedReport } from '../../../../domain/saved-report/saved-report.entity';
import { ISavedReportRepository } from '../../../../domain/saved-report/saved-report.repository';
import { SavedReportOrmEntity } from '../entities/saved-report.orm-entity';

@Injectable()
export class SavedReportTypeOrmRepository implements ISavedReportRepository {
  constructor(@InjectRepository(SavedReportOrmEntity) private readonly repo: Repository<SavedReportOrmEntity>) {}

  async findById(id: string): Promise<SavedReport | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.toDomain(e) : null;
  }

  async findByUser(userId: string): Promise<SavedReport[]> {
    const entities = await this.repo.find({
      where: { createdBy: userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findPublic(entityType: string): Promise<SavedReport[]> {
    const entities = await this.repo.find({
      where: { entityType, isPublic: true },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async save(report: Partial<SavedReport>): Promise<SavedReport> {
    const e = this.repo.create(report);
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  private toDomain(e: SavedReportOrmEntity): SavedReport {
    const d = new SavedReport();
    d.id = e.id;
    d.name = e.name;
    d.description = e.description;
    d.entityType = e.entityType;
    d.fieldMetadata = e.fieldMetadata;
    d.createdBy = e.createdBy;
    d.createdByName = e.createdByName;
    d.isPublic = e.isPublic;
    d.createdAt = e.createdAt;
    d.updatedAt = e.updatedAt;
    return d;
  }
}
