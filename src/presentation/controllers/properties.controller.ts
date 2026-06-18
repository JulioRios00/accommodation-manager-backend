import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { GetPropertiesUseCase } from '../../application/use-cases/get-properties.use-case';
import { SavePropertyUseCase, SavePropertyDto } from '../../application/use-cases/save-property.use-case';
import { DeletePropertyUseCase } from '../../application/use-cases/delete-property.use-case';

@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly getProperties: GetPropertiesUseCase,
    private readonly saveProperty: SavePropertyUseCase,
    private readonly deleteProperty: DeletePropertyUseCase,
  ) {}

  @Get()
  async findAll() {
    return this.getProperties.execute();
  }

  @Post()
  async create(@Body() dto: SavePropertyDto) {
    return this.saveProperty.execute(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: SavePropertyDto) {
    return this.saveProperty.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.deleteProperty.execute(id);
  }
}
