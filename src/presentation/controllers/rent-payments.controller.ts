import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { GetRentPaymentsUseCase } from '../../application/use-cases/get-rent-payments.use-case';
import { SaveRentPaymentUseCase, SaveRentPaymentDto } from '../../application/use-cases/save-rent-payment.use-case';
import { DeleteRentPaymentUseCase } from '../../application/use-cases/delete-rent-payment.use-case';
import { AddRentInstallmentUseCase, AddRentInstallmentDto } from '../../application/use-cases/add-rent-installment.use-case';
import { GenerateUpcomingRentPaymentsUseCase } from '../../application/use-cases/generate-upcoming-rent-payments.use-case';
import { Roles } from '../decorators/roles.decorator';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { Actor } from '../../application/services/audit-log.service';

@Controller('rent-payments')
export class RentPaymentsController {
  constructor(
    private readonly getRentPayments: GetRentPaymentsUseCase,
    private readonly saveRentPayment: SaveRentPaymentUseCase,
    private readonly deleteRentPayment: DeleteRentPaymentUseCase,
    private readonly addInstallment: AddRentInstallmentUseCase,
    private readonly generateUpcoming: GenerateUpcomingRentPaymentsUseCase,
  ) {}

  @Get()
  async findAll(
    @Query('propertyId') propertyId?: string,
    @Query('month') month?: string,
    @Query('residentId') residentId?: string,
  ) {
    return this.getRentPayments.execute({ propertyId, month, residentId });
  }

  @Post()
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async create(@Body() dto: SaveRentPaymentDto, @CurrentActor() actor?: Actor) { return this.saveRentPayment.execute(dto, actor); }

  @Put(':id')
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async update(@Param('id') id: string, @Body() dto: SaveRentPaymentDto, @CurrentActor() actor?: Actor) {
    return this.saveRentPayment.execute({ ...dto, id }, actor);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async remove(@Param('id') id: string, @CurrentActor() actor?: Actor) { await this.deleteRentPayment.execute(id, actor); }

  @Post(':id/installments')
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async addPayment(@Param('id') rentPaymentId: string, @Body() dto: AddRentInstallmentDto) {
    return this.addInstallment.execute({ ...dto, rentPaymentId });
  }

  @Post('generate-upcoming')
  @Roles('sysadmin', 'manager')
  async generateUpcomingNow() { return this.generateUpcoming.execute(); }
}
