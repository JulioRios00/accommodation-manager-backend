import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { GetPropertiesUseCase } from '../../application/use-cases/get-properties.use-case';
import { SavePropertyUseCase, SavePropertyDto } from '../../application/use-cases/save-property.use-case';
import { DeletePropertyUseCase } from '../../application/use-cases/delete-property.use-case';
import { HardDeletePropertyUseCase } from '../../application/use-cases/hard-delete-property.use-case';
import { Roles } from '../decorators/roles.decorator';

@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly getProperties: GetPropertiesUseCase,
    private readonly saveProperty: SavePropertyUseCase,
    private readonly deleteProperty: DeletePropertyUseCase,
    private readonly hardDeleteProperty: HardDeletePropertyUseCase,
  ) {}

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.getProperties.execute(includeInactive === 'true');
  }

  @Post()
  @Roles('sysadmin', 'manager')
  async create(@Body() dto: SavePropertyDto) {
    return this.saveProperty.execute(dto);
  }

  @Put(':id')
  @Roles('sysadmin', 'manager')
  async update(@Param('id') id: string, @Body() dto: SavePropertyDto) {
    return this.saveProperty.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager')
  async remove(@Param('id') id: string) {
    await this.deleteProperty.execute(id);
  }

  @Delete(':id/hard')
  @HttpCode(204)
  @Roles('sysadmin')
  async removeHard(@Param('id') id: string) {
    await this.hardDeleteProperty.execute(id);
  }
}
