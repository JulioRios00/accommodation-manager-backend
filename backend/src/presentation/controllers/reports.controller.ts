import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { GetDelinquencyReportUseCase } from '../../application/use-cases/get-delinquency-report.use-case';
import { GetPortfolioSnapshotUseCase } from '../../application/use-cases/get-portfolio-snapshot.use-case';
import { PreviewOverdueEmailsUseCase } from '../../application/use-cases/preview-overdue-emails.use-case';
import { OverdueEmailReportService } from '../../application/services/overdue-email-report.service';
import { Roles } from '../decorators/roles.decorator';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly delinquencyReport: GetDelinquencyReportUseCase,
    private readonly portfolioSnapshot: GetPortfolioSnapshotUseCase,
    private readonly previewOverdueEmails: PreviewOverdueEmailsUseCase,
    private readonly overdueEmailReport: OverdueEmailReportService,
  ) {}

  /**
   * The overdue-rent emails as the escalation job would render them, for review before they
   * go out. Read-only: nothing is sent and no reminder is stamped, so looking at this cannot
   * stop a real email being sent later.
   *
   * Restricted, because every row contains a resident's address and what they owe.
   */
  @Get('overdue-emails')
  @Roles('sysadmin', 'manager')
  async getOverdueEmails(
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const rows = await this.previewOverdueEmails.execute();
    if (format === 'xlsx') {
      const buffer = await this.overdueEmailReport.generate(rows);
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="overdue-emails-${stamp}.xlsx"`);
      return res.send(buffer);
    }
    return rows;
  }

  @Get('portfolio-snapshot')
  async getPortfolioSnapshot(@Query('date') date?: string) {
    if (!date) throw new BadRequestException('date is required (YYYY-MM-DD)');
    return this.portfolioSnapshot.execute(date);
  }

  @Get('delinquency')
  async getDelinquency(
    @Query('propertyId') propertyId?: string,
    @Query('month') month?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const rows = await this.delinquencyReport.execute({ propertyId, month });
    if (format === 'csv') {
      const header = 'Month,Resident,Property,Address,Rent Amount,Amount Paid,Amount Due,Status\n';
      const csv = rows.map(r =>
        `${r.month},"${r.residentName}","${r.propertyCode}","${r.fullAddress}",${r.rentAmount},${r.amountPaid},${r.amountDue},${r.lateStatus}`
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=delinquency-report.csv');
      return res.send(header + csv);
    }
    return rows;
  }
}
