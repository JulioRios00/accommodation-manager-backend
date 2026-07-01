import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { GetCompaniesUseCase } from '../../application/use-cases/get-companies.use-case';
import { SaveCompanyUseCase, SaveCompanyDto } from '../../application/use-cases/save-company.use-case';
import { DeleteCompanyUseCase } from '../../application/use-cases/delete-company.use-case';
import { Roles } from '../decorators/roles.decorator';

@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly getCompanies: GetCompaniesUseCase,
    private readonly saveCompany: SaveCompanyUseCase,
    private readonly deleteCompany: DeleteCompanyUseCase,
  ) {}

  @Get()
  async findAll() { return this.getCompanies.execute(); }

  @Post()
  @Roles('sysadmin', 'manager')
  async create(@Body() dto: SaveCompanyDto) { return this.saveCompany.execute(dto); }

  @Put(':id')
  @Roles('sysadmin', 'manager')
  async update(@Param('id') id: string, @Body() dto: SaveCompanyDto) {
    return this.saveCompany.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager')
  async remove(@Param('id') id: string) { await this.deleteCompany.execute(id); }
}
