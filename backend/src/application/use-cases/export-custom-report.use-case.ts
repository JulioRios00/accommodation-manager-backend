import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ReportQueryService } from '../services/report-query.service';
import { ReportRegistryService } from '../services/report-registry.service';
import { XlsxReportExporterService } from '../services/xlsx-report-exporter.service';
import { PdfReportExporterService } from '../services/pdf-report-exporter.service';
import { AuditLogService, Actor } from '../services/audit-log.service';
import { ReportQueryRequest } from '../../domain/custom-report/report-metadata.types';

// Server-side sanity ceiling — protects the memory-constrained host from an unbounded export,
// independent of the smaller cap used for interactive preview.
const EXPORT_ROW_CAP = 10_000;

export type ReportExportFormat = 'pdf' | 'xlsx';

@Injectable()
export class ExportCustomReportUseCase {
  constructor(
    private readonly queryService: ReportQueryService,
    private readonly registry: ReportRegistryService,
    private readonly xlsxExporter: XlsxReportExporterService,
    private readonly pdfExporter: PdfReportExporterService,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(
    request: ReportQueryRequest,
    format: ReportExportFormat,
    actor: Actor,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const entity = this.registry.getEntity(request.entity);
    const fields = request.fields.map((key) => this.registry.getField(request.entity, key));

    const { rows } = await this.queryService.run(request, EXPORT_ROW_CAP);

    const buffer =
      format === 'xlsx'
        ? await this.xlsxExporter.generate(entity.label, fields, rows)
        : await this.pdfExporter.generate(entity.label, fields, rows);

    await this.auditLog.record({
      actor,
      action: 'export',
      entityType: 'CustomReport',
      // entityId is UUID-typed and a report export isn't tied to one row — a real random id
      // keeps the write valid (a non-UUID string here silently fails the insert, which
      // AuditLogService swallows by design). The actual entity key is in `after.entity` below.
      entityId: randomUUID(),
      before: null,
      after: {
        entity: request.entity,
        fields: request.fields.join(', '),
        filters: JSON.stringify(request.filters),
        sort: JSON.stringify(request.sort),
        format,
        rowCount: rows.length,
      },
    });

    const datestamp = new Date().toISOString().slice(0, 10);
    const extension = format === 'xlsx' ? 'xlsx' : 'pdf';
    const contentType =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

    return {
      buffer,
      filename: `${request.entity}-report-${datestamp}.${extension}`,
      contentType,
    };
  }
}
