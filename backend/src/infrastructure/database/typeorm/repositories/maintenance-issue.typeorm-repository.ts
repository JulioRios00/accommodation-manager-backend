import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceIssue } from '../../../../domain/maintenance-issue/maintenance-issue.entity';
import { IMaintenanceIssueRepository } from '../../../../domain/maintenance-issue/maintenance-issue.repository';
import { MaintenanceIssueOrmEntity } from '../entities/maintenance-issue.orm-entity';

@Injectable()
export class MaintenanceIssueTypeOrmRepository implements IMaintenanceIssueRepository {
  constructor(@InjectRepository(MaintenanceIssueOrmEntity) private readonly repo: Repository<MaintenanceIssueOrmEntity>) {}

  async findById(id: string): Promise<MaintenanceIssue | null> {
    const e = await this.repo.findOne({ where: { id } });
    return e ? this.toDomain(e) : null;
  }

  async findByTicketId(ticketId: string): Promise<MaintenanceIssue[]> {
    const entities = await this.repo.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async save(issue: Partial<MaintenanceIssue>): Promise<MaintenanceIssue> {
    const e = this.repo.create(issue);
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  private toDomain(e: MaintenanceIssueOrmEntity): MaintenanceIssue {
    const d = new MaintenanceIssue();
    d.id = e.id;
    d.ticketId = e.ticketId;
    d.title = e.title;
    d.category = e.category;
    d.status = e.status;
    d.descriptionRequested = e.descriptionRequested;
    d.descriptionDone = e.descriptionDone;
    d.assignedTo = e.assignedTo;
    d.createdAt = e.createdAt;
    d.updatedAt = e.updatedAt;
    return d;
  }
}
