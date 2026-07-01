import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { GetRentPaymentsUseCase } from '../../application/use-cases/get-rent-payments.use-case';
import { SaveRentPaymentUseCase, SaveRentPaymentDto } from '../../application/use-cases/save-rent-payment.use-case';
import { DeleteRentPaymentUseCase } from '../../application/use-cases/delete-rent-payment.use-case';
import { AddRentInstallmentUseCase, AddRentInstallmentDto } from '../../application/use-cases/add-rent-installment.use-case';
import { Roles } from '../decorators/roles.decorator';

@Controller('rent-payments')
export class RentPaymentsController {
  constructor(
    private readonly getRentPayments: GetRentPaymentsUseCase,
    private readonly saveRentPayment: SaveRentPaymentUseCase,
    private readonly deleteRentPayment: DeleteRentPaymentUseCase,
    private readonly addInstallment: AddRentInstallmentUseCase,
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
  @Roles('sysadmin', 'manager', 'administrator')
  async create(@Body() dto: SaveRentPaymentDto) { return this.saveRentPayment.execute(dto); }

  @Put(':id')
  @Roles('sysadmin', 'manager', 'administrator')
  async update(@Param('id') id: string, @Body() dto: SaveRentPaymentDto) {
    return this.saveRentPayment.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager')
  async remove(@Param('id') id: string) { await this.deleteRentPayment.execute(id); }

  @Post(':id/installments')
  @Roles('sysadmin', 'manager', 'administrator')
  async addPayment(@Param('id') rentPaymentId: string, @Body() dto: AddRentInstallmentDto) {
    return this.addInstallment.execute({ ...dto, rentPaymentId });
  }
}
