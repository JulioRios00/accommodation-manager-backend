import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Res } from '@nestjs/common';
import { Response } from 'express';
import { GetReportEntitiesUseCase } from '../../application/use-cases/get-report-entities.use-case';
import { GetReportEntityFieldsUseCase } from '../../application/use-cases/get-report-entity-fields.use-case';
import { PreviewCustomReportUseCase } from '../../application/use-cases/preview-custom-report.use-case';
import { ExportCustomReportUseCase, ReportExportFormat } from '../../application/use-cases/export-custom-report.use-case';
import { ReportQueryRequest } from '../../domain/custom-report/report-metadata.types';
import { ISavedReportRepository, SAVED_REPORT_REPOSITORY } from '../../domain/saved-report/saved-report.repository';
import { SavedReport } from '../../domain/saved-report/saved-report.entity';
import { Actor } from '../../application/services/audit-log.service';
import { Roles } from '../decorators/roles.decorator';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { Inject } from '@nestjs/common';

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
    @Inject(SAVED_REPORT_REPOSITORY) private readonly savedReportRepo: ISavedReportRepository,
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

  @Post('saved')
  async saveReport(
    @Body() body: { name: string; description?: string; entity: string; fields: string[]; filters: any[]; sort: any[]; isPublic?: boolean },
    @CurrentActor() actor: Actor,
  ) {
    return this.savedReportRepo.save({
      name: body.name,
      description: body.description || null,
      entityType: body.entity,
      fieldMetadata: { fields: body.fields, filters: body.filters, sort: body.sort },
      createdBy: actor.userId,
      createdByName: null,
      isPublic: body.isPublic || false,
    });
  }

  @Get('saved')
  async listUserReports(@CurrentActor() actor: Actor) {
    return this.savedReportRepo.findByUser(actor.userId);
  }

  @Get('saved/public/:entity')
  async listPublicReports(@Param('entity') entity: string) {
    return this.savedReportRepo.findPublic(entity);
  }

  @Get('saved/:id')
  async getReport(@Param('id') id: string) {
    const report = await this.savedReportRepo.findById(id);
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  @Put('saved/:id')
  async updateReport(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; isPublic?: boolean },
    @CurrentActor() actor: Actor,
  ) {
    const report = await this.savedReportRepo.findById(id);
    if (!report) throw new NotFoundException('Report not found');
    if (report.createdBy !== actor.userId && !['sysadmin', 'manager'].includes(actor.role)) {
      throw new NotFoundException('Insufficient permissions');
    }
    return this.savedReportRepo.save({
      ...report,
      name: body.name ?? report.name,
      description: body.description !== undefined ? body.description : report.description,
      isPublic: body.isPublic !== undefined ? body.isPublic : report.isPublic,
    });
  }

  @Delete('saved/:id')
  async deleteReport(@Param('id') id: string, @CurrentActor() actor: Actor) {
    const report = await this.savedReportRepo.findById(id);
    if (!report) throw new NotFoundException('Report not found');
    if (report.createdBy !== actor.userId && !['sysadmin', 'manager'].includes(actor.role)) {
      throw new NotFoundException('Insufficient permissions');
    }
    await this.savedReportRepo.delete(id);
    return { success: true };
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
