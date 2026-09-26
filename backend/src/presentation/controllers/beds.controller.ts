import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { GetBedsUseCase } from '../../application/use-cases/get-beds.use-case';
import { SaveBedUseCase, SaveBedDto } from '../../application/use-cases/save-bed.use-case';
import { DeleteBedUseCase } from '../../application/use-cases/delete-bed.use-case';
import { Roles } from '../decorators/roles.decorator';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { Actor } from '../../application/services/audit-log.service';

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
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async create(@Body() dto: SaveBedDto, @CurrentActor() actor?: Actor) {
    return this.saveBed.execute(dto, actor);
  }

  @Put(':id')
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async update(@Param('id') id: string, @Body() dto: SaveBedDto, @CurrentActor() actor?: Actor) {
    return this.saveBed.execute({ ...dto, id }, actor);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async remove(@Param('id') id: string, @CurrentActor() actor?: Actor) {
    await this.deleteBed.execute(id, actor);
  }
}
