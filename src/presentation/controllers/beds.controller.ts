import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { GetBedsUseCase } from '../../application/use-cases/get-beds.use-case';
import { SaveBedUseCase, SaveBedDto } from '../../application/use-cases/save-bed.use-case';
import { DeleteBedUseCase } from '../../application/use-cases/delete-bed.use-case';
import { Roles } from '../decorators/roles.decorator';

@Controller('beds')
export class BedsController {
  constructor(
    private readonly getBeds: GetBedsUseCase,
    private readonly saveBed: SaveBedUseCase,
    private readonly deleteBed: DeleteBedUseCase,
  ) {}

  @Get()
  async findAll(@Query('propertyId') propertyId?: string) {
    return this.getBeds.execute(propertyId);
  }

  @Post()
  @Roles('sysadmin', 'manager')
  async create(@Body() dto: SaveBedDto) {
    return this.saveBed.execute(dto);
  }

  @Put(':id')
  @Roles('sysadmin', 'manager')
  async update(@Param('id') id: string, @Body() dto: SaveBedDto) {
    return this.saveBed.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager')
  async remove(@Param('id') id: string) {
    await this.deleteBed.execute(id);
  }
}
