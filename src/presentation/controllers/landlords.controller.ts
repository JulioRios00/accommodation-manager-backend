import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { GetLandlordsUseCase } from '../../application/use-cases/get-landlords.use-case';
import { SaveLandlordUseCase, SaveLandlordDto } from '../../application/use-cases/save-landlord.use-case';
import { DeleteLandlordUseCase } from '../../application/use-cases/delete-landlord.use-case';
import { GetPropertyAdministratorsUseCase } from '../../application/use-cases/get-property-administrators.use-case';
import { SavePropertyAdministratorUseCase, SavePropertyAdministratorDto } from '../../application/use-cases/save-property-administrator.use-case';
import { DeletePropertyAdministratorUseCase } from '../../application/use-cases/delete-property-administrator.use-case';
import { Roles } from '../decorators/roles.decorator';

@Controller('landlords')
export class LandlordsController {
  constructor(
    private readonly getLandlords: GetLandlordsUseCase,
    private readonly saveLandlord: SaveLandlordUseCase,
    private readonly deleteLandlord: DeleteLandlordUseCase,
    private readonly getAdmins: GetPropertyAdministratorsUseCase,
    private readonly saveAdmin: SavePropertyAdministratorUseCase,
    private readonly deleteAdmin: DeletePropertyAdministratorUseCase,
  ) {}

  @Get()
  async findAll() { return this.getLandlords.execute(); }

  @Post()
  @Roles('sysadmin', 'manager')
  async create(@Body() dto: SaveLandlordDto) { return this.saveLandlord.execute(dto); }

  @Put(':id')
  @Roles('sysadmin', 'manager')
  async update(@Param('id') id: string, @Body() dto: SaveLandlordDto) {
    return this.saveLandlord.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager')
  async remove(@Param('id') id: string) { await this.deleteLandlord.execute(id); }

  @Get(':propertyId/administrators')
  async getPropertyAdmins(@Param('propertyId') propertyId: string) {
    return this.getAdmins.execute(propertyId);
  }

  @Post(':propertyId/administrators')
  @Roles('sysadmin', 'manager')
  async addAdmin(@Param('propertyId') propertyId: string, @Body() dto: SavePropertyAdministratorDto) {
    return this.saveAdmin.execute({ ...dto, propertyId });
  }

  @Delete(':propertyId/administrators/:clerkUserId')
  @HttpCode(204)
  @Roles('sysadmin', 'manager')
  async removeAdmin(@Param('propertyId') propertyId: string, @Param('clerkUserId') clerkUserId: string) {
    await this.deleteAdmin.execute(propertyId, clerkUserId);
  }
}
