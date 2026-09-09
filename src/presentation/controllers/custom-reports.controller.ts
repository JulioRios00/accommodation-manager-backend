import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { GetReportEntitiesUseCase } from '../../application/use-cases/get-report-entities.use-case';
import { GetReportEntityFieldsUseCase } from '../../application/use-cases/get-report-entity-fields.use-case';
import { PreviewCustomReportUseCase } from '../../application/use-cases/preview-custom-report.use-case';
import { ExportCustomReportUseCase, ReportExportFormat } from '../../application/use-cases/export-custom-report.use-case';
import { ReportQueryRequest } from '../../domain/custom-report/report-metadata.types';
import { Actor } from '../../application/services/audit-log.service';
import { Roles } from '../decorators/roles.decorator';
import { CurrentActor } from '../decorators/current-actor.decorator';

// Restricted to Management/SysAdmin only, per UC-402 — a separate, stricter gate than the
// existing /reports endpoints (whose default access extends to administrator/staff too).
@Controller('reports')
@Roles('sysadmin', 'manager')
export class CustomReportsController {
  constructor(
    private readonly getEntities: GetReportEntitiesUseCase,
    private readonly getEntityFields: GetReportEntityFieldsUseCase,
    private readonly previewReport: PreviewCustomReportUseCase,
    private readonly exportReport: ExportCustomReportUseCase,
  ) {}

  @Get('entities')
  listEntities() {
    return this.getEntities.execute();
  }

  @Get('entities/:entity/fields')
  listFields(@Param('entity') entity: string) {
    return this.getEntityFields.execute(entity);
  }

  @Post('preview')
  preview(@Body() body: ReportQueryRequest) {
    return this.previewReport.execute(normalizeRequest(body));
  }

  @Post('export/pdf')
  async exportPdf(@Body() body: ReportQueryRequest, @CurrentActor() actor: Actor, @Res() res: Response) {
    await this.streamExport(body, 'pdf', actor, res);
  }

  @Post('export/xlsx')
  async exportXlsx(@Body() body: ReportQueryRequest, @CurrentActor() actor: Actor, @Res() res: Response) {
    await this.streamExport(body, 'xlsx', actor, res);
  }

  private async streamExport(body: ReportQueryRequest, format: ReportExportFormat, actor: Actor, res: Response) {
    const { buffer, filename, contentType } = await this.exportReport.execute(normalizeRequest(body), format, actor);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}

// Defends against a malformed payload (missing arrays) reaching the query service, which
// otherwise assumes `.filters`/`.sort` are always arrays.
function normalizeRequest(body: ReportQueryRequest): ReportQueryRequest {
  return {
    entity: body.entity,
    fields: body.fields ?? [],
    filters: body.filters ?? [],
    sort: body.sort ?? [],
  };
}
