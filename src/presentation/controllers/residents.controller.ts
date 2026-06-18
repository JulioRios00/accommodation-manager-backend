import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { GetResidentsUseCase } from '../../application/use-cases/get-residents.use-case';
import { SaveResidentUseCase, SaveResidentDto } from '../../application/use-cases/save-resident.use-case';
import { DeleteResidentUseCase } from '../../application/use-cases/delete-resident.use-case';

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
  async create(@Body() dto: SaveResidentDto) {
    return this.saveResident.execute(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: SaveResidentDto) {
    return this.saveResident.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.deleteResident.execute(id);
  }
}
