import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { GetBedroomsUseCase } from '../../application/use-cases/get-bedrooms.use-case';
import { SaveBedroomUseCase, SaveBedroomDto } from '../../application/use-cases/save-bedroom.use-case';
import { DeleteBedroomUseCase } from '../../application/use-cases/delete-bedroom.use-case';
import { Roles } from '../decorators/roles.decorator';

@Controller('bedrooms')
export class BedroomsController {
  constructor(
    private readonly getBedrooms: GetBedroomsUseCase,
    private readonly saveBedroom: SaveBedroomUseCase,
    private readonly deleteBedroom: DeleteBedroomUseCase,
  ) {}

  @Get()
  async findAll(@Query('propertyId') propertyId?: string) {
    return this.getBedrooms.execute(propertyId);
  }

  @Post()
  @Roles('sysadmin', 'manager')
  async create(@Body() dto: SaveBedroomDto) {
    return this.saveBedroom.execute(dto);
  }

  @Put(':id')
  @Roles('sysadmin', 'manager')
  async update(@Param('id') id: string, @Body() dto: SaveBedroomDto) {
    return this.saveBedroom.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager')
  async remove(@Param('id') id: string) {
    await this.deleteBedroom.execute(id);
  }
}
