import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { GetResidentsUseCase } from '../../application/use-cases/get-residents.use-case';
import { SaveResidentUseCase, SaveResidentDto } from '../../application/use-cases/save-resident.use-case';
import { DeleteResidentUseCase } from '../../application/use-cases/delete-resident.use-case';
import { Roles } from '../decorators/roles.decorator';

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
  @Roles('sysadmin', 'manager')
  async create(@Body() dto: SaveResidentDto) {
    return this.saveResident.execute(dto);
  }

  @Put(':id')
  @Roles('sysadmin', 'manager', 'administrator')
  async update(@Param('id') id: string, @Body() dto: SaveResidentDto) {
    return this.saveResident.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager')
  async remove(@Param('id') id: string) {
    await this.deleteResident.execute(id);
  }
}
