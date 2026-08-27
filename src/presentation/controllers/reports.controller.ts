import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { GetDelinquencyReportUseCase } from '../../application/use-cases/get-delinquency-report.use-case';
import { GetPortfolioSnapshotUseCase } from '../../application/use-cases/get-portfolio-snapshot.use-case';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly delinquencyReport: GetDelinquencyReportUseCase,
    private readonly portfolioSnapshot: GetPortfolioSnapshotUseCase,
  ) {}

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
