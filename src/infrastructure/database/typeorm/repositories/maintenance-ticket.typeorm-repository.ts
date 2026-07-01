import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { MaintenanceTicket } from '../../../../domain/maintenance-ticket/maintenance-ticket.entity';
import { IMaintenanceTicketRepository, TicketFilter } from '../../../../domain/maintenance-ticket/maintenance-ticket.repository';
import { MaintenanceTicketOrmEntity } from '../entities/maintenance-ticket.orm-entity';

@Injectable()
export class MaintenanceTicketTypeOrmRepository implements IMaintenanceTicketRepository {
  constructor(@InjectRepository(MaintenanceTicketOrmEntity) private readonly repo: Repository<MaintenanceTicketOrmEntity>) {}

  async findAll(filter?: TicketFilter): Promise<MaintenanceTicket[]> {
    const where: FindOptionsWhere<MaintenanceTicketOrmEntity> = { active: true };
    if (filter?.propertyId) where.propertyId = filter.propertyId;
    if (filter?.status) where.status = filter.status;
    if (filter?.urgency) where.urgency = filter.urgency;
    return (await this.repo.find({ where, order: { createdAt: 'DESC' } })).map(this.toDomain);
  }

  async findById(id: string): Promise<MaintenanceTicket | null> {
    const e = await this.repo.findOne({ where: { id, active: true } });
    return e ? this.toDomain(e) : null;
  }

  async getNextOrderNumber(): Promise<string> {
    const result = await this.repo
      .createQueryBuilder('t')
      .select("MAX(CAST(SPLIT_PART(t.orderNumber, '-', 2) AS INTEGER))", 'max')
      .getRawOne();
    const next = (Number(result?.max) || 0) + 1;
    return `STA-${String(next).padStart(3, '0')}`;
  }

  async save(ticket: Partial<MaintenanceTicket>): Promise<MaintenanceTicket> {
    const e = this.repo.create(ticket as DeepPartial<MaintenanceTicketOrmEntity>);
    return this.toDomain(await this.repo.save(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }

  private toDomain(e: MaintenanceTicketOrmEntity): MaintenanceTicket {
    const d = new MaintenanceTicket();
    d.id = e.id; d.orderNumber = e.orderNumber; d.propertyId = e.propertyId;
    d.serviceProviderId = e.serviceProviderId ?? null; d.title = e.title;
    d.descriptionRequested = e.descriptionRequested ?? null;
    d.additionalDetails = e.additionalDetails ?? null; d.descriptionDone = e.descriptionDone ?? null;
    d.materials = e.materials ?? null; d.priority = e.priority ?? 0; d.urgency = e.urgency;
    d.status = e.status; d.clientName = e.clientName ?? null; d.clientPhone = e.clientPhone ?? null;
    d.approvedBy = e.approvedBy ?? null; d.approvalDate = e.approvalDate ?? null;
    d.chargedBy = e.chargedBy ?? null; d.houseCompany = e.houseCompany ?? null;
    d.maintenanceCost = e.maintenanceCost ? Number(e.maintenanceCost) : null;
    d.materialCost = e.materialCost ? Number(e.materialCost) : null;
    d.totalCost = e.totalCost ? Number(e.totalCost) : null;
    d.entryNoticeDate = e.entryNoticeDate ?? null; d.entryCheckIn = e.entryCheckIn ?? null;
    d.entryCheckOut = e.entryCheckOut ?? null; d.causedByResident = e.causedByResident ?? false;
    d.tags = e.tags ?? []; d.clerkUserId = e.clerkUserId ?? null; d.clerkUserName = e.clerkUserName ?? null;
    d.active = e.active; d.createdAt = e.createdAt; d.updatedAt = e.updatedAt;
    return d;
  }
}
