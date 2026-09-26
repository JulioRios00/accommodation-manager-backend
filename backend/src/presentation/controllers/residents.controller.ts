import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { GetResidentsUseCase } from '../../application/use-cases/get-residents.use-case';
import { SaveResidentUseCase, SaveResidentDto } from '../../application/use-cases/save-resident.use-case';
import { DeleteResidentUseCase } from '../../application/use-cases/delete-resident.use-case';
import { Roles } from '../decorators/roles.decorator';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { Actor } from '../../application/services/audit-log.service';

@Controller('residents')
export class ResidentsController {
  constructor(
    private readonly getResidents: GetResidentsUseCase,
    private readonly saveResident: SaveResidentUseCase,
    private readonly deleteResident: DeleteResidentUseCase,
  ) {}

  @Get()
  async findAll() {
    return this.getResidents.execute();
  }

  @Post()
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async create(@Body() dto: SaveResidentDto, @CurrentActor() actor?: Actor) {
    return this.saveResident.execute(dto, actor);
  }

  @Put(':id')
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async update(@Param('id') id: string, @Body() dto: SaveResidentDto, @CurrentActor() actor?: Actor) {
    return this.saveResident.execute({ ...dto, id }, actor);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async remove(@Param('id') id: string, @CurrentActor() actor?: Actor) {
    await this.deleteResident.execute(id, actor);
  }
}
