import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { GetLandlordPaymentsUseCase } from '../../application/use-cases/get-landlord-payments.use-case';
import { SaveLandlordPaymentUseCase, SaveLandlordPaymentDto } from '../../application/use-cases/save-landlord-payment.use-case';
import { DeleteLandlordPaymentUseCase } from '../../application/use-cases/delete-landlord-payment.use-case';
import { GenerateUpcomingLandlordPaymentsUseCase } from '../../application/use-cases/generate-upcoming-landlord-payments.use-case';
import { GetLandlordDisbursementLedgerUseCase } from '../../application/use-cases/get-landlord-disbursement-ledger.use-case';
import { UpdateLandlordPaymentNotesUseCase } from '../../application/use-cases/update-landlord-payment-notes.use-case';
import { MarkLandlordPaymentPaidUseCase } from '../../application/use-cases/mark-landlord-payment-paid.use-case';
import { ExportLandlordDisbursementsUseCase } from '../../application/use-cases/export-landlord-disbursements.use-case';
import { Roles } from '../decorators/roles.decorator';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { Actor } from '../../application/services/audit-log.service';

@Controller('landlord-payments')
export class LandlordPaymentsController {
  constructor(
    private readonly getLandlordPayments: GetLandlordPaymentsUseCase,
    private readonly saveLandlordPayment: SaveLandlordPaymentUseCase,
    private readonly deleteLandlordPayment: DeleteLandlordPaymentUseCase,
    private readonly generateUpcoming: GenerateUpcomingLandlordPaymentsUseCase,
    private readonly getDisbursementLedger: GetLandlordDisbursementLedgerUseCase,
    private readonly updateNotes: UpdateLandlordPaymentNotesUseCase,
    private readonly markPaid: MarkLandlordPaymentPaidUseCase,
    private readonly exportDisbursements: ExportLandlordDisbursementsUseCase,
  ) {}

  @Get('ledger')
  @Roles('sysadmin', 'manager')
  async ledger() {
    return this.getDisbursementLedger.execute();
  }

  @Put(':id/notes')
  @Roles('sysadmin', 'manager')
  async setNotes(@Param('id') id: string, @Body('notes') notes: string | null) {
    return this.updateNotes.execute(id, notes ?? null);
  }

  @Post(':id/mark-paid')
  @Roles('sysadmin', 'manager')
  async markAsPaid(@Param('id') id: string, @CurrentActor() actor?: Actor) {
    return this.markPaid.execute(id, actor);
  }

  @Post('export')
  @Roles('sysadmin', 'manager')
  async export(@Body('ids') ids: string[], @Res() res: Response) {
    const csv = await this.exportDisbursements.execute(ids ?? []);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="landlord-disbursements-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  }

  @Get()
  async findAll(
    @Query('propertyId') propertyId?: string,
    @Query('landlordId') landlordId?: string,
    @Query('month') month?: string,
  ) {
    return this.getLandlordPayments.execute({ propertyId, landlordId, month });
  }

  @Post()
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async create(@Body() dto: SaveLandlordPaymentDto) { return this.saveLandlordPayment.execute(dto); }

  @Put(':id')
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async update(@Param('id') id: string, @Body() dto: SaveLandlordPaymentDto) {
    return this.saveLandlordPayment.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async remove(@Param('id') id: string) { await this.deleteLandlordPayment.execute(id); }

  @Post('generate-upcoming')
  @Roles('sysadmin', 'manager')
  async generateUpcomingNow() { return this.generateUpcoming.execute(); }
}
