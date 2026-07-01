import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { GetLandlordPaymentsUseCase } from '../../application/use-cases/get-landlord-payments.use-case';
import { SaveLandlordPaymentUseCase, SaveLandlordPaymentDto } from '../../application/use-cases/save-landlord-payment.use-case';
import { DeleteLandlordPaymentUseCase } from '../../application/use-cases/delete-landlord-payment.use-case';
import { Roles } from '../decorators/roles.decorator';

@Controller('landlord-payments')
export class LandlordPaymentsController {
  constructor(
    private readonly getLandlordPayments: GetLandlordPaymentsUseCase,
    private readonly saveLandlordPayment: SaveLandlordPaymentUseCase,
    private readonly deleteLandlordPayment: DeleteLandlordPaymentUseCase,
  ) {}

  @Get()
  async findAll(
    @Query('propertyId') propertyId?: string,
    @Query('landlordId') landlordId?: string,
    @Query('month') month?: string,
  ) {
    return this.getLandlordPayments.execute({ propertyId, landlordId, month });
  }

  @Post()
  @Roles('sysadmin', 'manager')
  async create(@Body() dto: SaveLandlordPaymentDto) { return this.saveLandlordPayment.execute(dto); }

  @Put(':id')
  @Roles('sysadmin', 'manager')
  async update(@Param('id') id: string, @Body() dto: SaveLandlordPaymentDto) {
    return this.saveLandlordPayment.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager')
  async remove(@Param('id') id: string) { await this.deleteLandlordPayment.execute(id); }
}
