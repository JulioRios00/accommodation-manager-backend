import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { GetServiceProvidersUseCase } from '../../application/use-cases/get-service-providers.use-case';
import { SaveServiceProviderUseCase, SaveServiceProviderDto } from '../../application/use-cases/save-service-provider.use-case';
import { DeleteServiceProviderUseCase } from '../../application/use-cases/delete-service-provider.use-case';
import { Roles } from '../decorators/roles.decorator';

@Controller('service-providers')
export class ServiceProvidersController {
  constructor(
    private readonly getServiceProviders: GetServiceProvidersUseCase,
    private readonly saveServiceProvider: SaveServiceProviderUseCase,
    private readonly deleteServiceProvider: DeleteServiceProviderUseCase,
  ) {}

  @Get()
  async findAll() { return this.getServiceProviders.execute(); }

  @Post()
  @Roles('sysadmin', 'manager')
  async create(@Body() dto: SaveServiceProviderDto) { return this.saveServiceProvider.execute(dto); }

  @Put(':id')
  @Roles('sysadmin', 'manager')
  async update(@Param('id') id: string, @Body() dto: SaveServiceProviderDto) {
    return this.saveServiceProvider.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager')
  async remove(@Param('id') id: string) { await this.deleteServiceProvider.execute(id); }
}
