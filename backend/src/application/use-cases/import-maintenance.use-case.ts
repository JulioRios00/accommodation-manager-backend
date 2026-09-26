import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseMaintenance } from '../../infrastructure/parsers/maintenance.parser';
import { IMaintenanceTicketRepository, MAINTENANCE_TICKET_REPOSITORY } from '../../domain/maintenance-ticket/maintenance-ticket.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { ImportSkipReason } from './import-deposits.use-case';

@Injectable()
export class ImportMaintenanceUseCase {
  private readonly logger = new Logger(ImportMaintenanceUseCase.name);

  constructor(
    @Inject(MAINTENANCE_TICKET_REPOSITORY) private readonly ticketRepo: IMaintenanceTicketRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
  ) {}

  async execute(buffer: Buffer): Promise<{ imported: number; skipped: number; skipReasons: ImportSkipReason[] }> {
    const rows = parseMaintenance(buffer);
    const properties = await this.propertyRepo.findAll();
    const byCode = new Map(properties.map(p => [p.code.toLowerCase(), p]));

    // Load all existing tickets for upsert by orderNumber
    const existing = await this.ticketRepo.findAll();
    const byOrderNumber = new Map(existing.map(t => [t.orderNumber, t]));

    let imported = 0;
    let skipped = 0;
    const skipReasons: ImportSkipReason[] = [];

    for (const row of rows) {
      const identifier = `${row.propertyCode} / ${row.orderNumber}`;
      const property = byCode.get(row.propertyCode.toLowerCase());
      if (!property) {
        skipped++;
        const reason = `Property "${row.propertyCode}" not found`;
        skipReasons.push({ identifier, reason });
        this.logger.warn(`[import-maintenance] skip ${identifier}: ${reason}`);
        continue;
      }

      const existingTicket = byOrderNumber.get(row.orderNumber);

      const status = this.normaliseStatus(row.status);
      const urgency = this.normalisePriority(row.priority);

      // Combine description + work items into descriptionRequested; work items into materials
      const descriptionRequested = row.descriptionRequested;
      const materials = row.workItems;

      await this.ticketRepo.save({
        ...(existingTicket ?? {}),
        id: existingTicket?.id,
        orderNumber: row.orderNumber,
        propertyId: property.id,
        title: row.descriptionRequested?.substring(0, 100) ?? row.orderNumber,
        descriptionRequested,
        materials,
        additionalDetails: row.additionalDetails,
        descriptionDone: row.descriptionDone,
        status,
        urgency,
        priority: row.priority,
        clientName: row.clientName,
        clientPhone: row.clientPhone,
        approvedBy: row.approvedBy,
        paymentApprovedBy: row.paymentApprovedBy,
        timeframe: row.timeframe,
        chargedBy: row.responsible,
        houseCompany: row.houseCompany,
        maintenanceCost: row.maintenanceCost,
        materialCost: row.materialCost,
        totalCost: row.totalCost,
        createdAt: row.dateOfOrder ?? existingTicket?.createdAt,
        active: true,
        tags: [],
      } as any);
      imported++;
    }

    return { imported, skipped, skipReasons };
  }

  private normaliseStatus(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower === 'done' || lower === 'completed') return 'completed';
    if (lower.includes('progress') || lower.includes('ongoing')) return 'in_progress';
    if (lower === 'cancelled' || lower === 'canceled') return 'cancelled';
    return 'open';
  }

  private normalisePriority(priority: number): string {
    if (priority >= 3) return 'High';
    if (priority >= 2) return 'Middle';
    return 'Low';
  }
}
