import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { GetDepositTransactionsUseCase } from '../../application/use-cases/get-deposit-transactions.use-case';
import { SaveDepositTransactionUseCase, SaveDepositTransactionDto } from '../../application/use-cases/save-deposit-transaction.use-case';
import { DeleteDepositTransactionUseCase } from '../../application/use-cases/delete-deposit-transaction.use-case';
import { Roles } from '../decorators/roles.decorator';

@Controller('deposit-transactions')
export class DepositTransactionsController {
  constructor(
    private readonly getDeposits: GetDepositTransactionsUseCase,
    private readonly saveDeposit: SaveDepositTransactionUseCase,
    private readonly deleteDeposit: DeleteDepositTransactionUseCase,
  ) {}

  @Get()
  async findAll(
    @Query('propertyId') propertyId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.getDeposits.execute({ propertyId, type, status });
  }

  @Post()
  @Roles('sysadmin', 'manager')
  async create(@Body() dto: SaveDepositTransactionDto) { return this.saveDeposit.execute(dto); }

  @Put(':id')
  @Roles('sysadmin', 'manager')
  async update(@Param('id') id: string, @Body() dto: SaveDepositTransactionDto) {
    return this.saveDeposit.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager')
  async remove(@Param('id') id: string) { await this.deleteDeposit.execute(id); }
}
