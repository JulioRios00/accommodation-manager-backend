import {
  Body, Controller, Delete, Get, Param, Post, Put, Query,
} from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { GetPropertySpacesUseCase } from '../../application/use-cases/get-property-spaces.use-case';
import { SavePropertySpaceUseCase, SavePropertySpaceDto } from '../../application/use-cases/save-property-space.use-case';
import { DeletePropertySpaceUseCase } from '../../application/use-cases/delete-property-space.use-case';
import { SaveSpaceItemUseCase, SaveSpaceItemDto } from '../../application/use-cases/save-space-item.use-case';
import { DeleteSpaceItemUseCase } from '../../application/use-cases/delete-space-item.use-case';

@Controller('property-spaces')
export class PropertySpacesController {
  constructor(
    private readonly getSpaces: GetPropertySpacesUseCase,
    private readonly saveSpace: SavePropertySpaceUseCase,
    private readonly deleteSpace: DeletePropertySpaceUseCase,
    private readonly saveItem: SaveSpaceItemUseCase,
    private readonly deleteItem: DeleteSpaceItemUseCase,
  ) {}

  @Get()
  findAll(@Query('propertyId') propertyId?: string) {
    return this.getSpaces.execute(propertyId);
  }

  @Post()
  @Roles('sysadmin', 'manager')
  create(@Body() dto: SavePropertySpaceDto) {
    return this.saveSpace.execute(dto);
  }

  @Put(':id')
  @Roles('sysadmin', 'manager')
  update(@Param('id') id: string, @Body() dto: SavePropertySpaceDto) {
    return this.saveSpace.execute({ ...dto, id });
  }

  @Delete(':id')
  @Roles('sysadmin', 'manager')
  remove(@Param('id') id: string) {
    return this.deleteSpace.execute(id);
  }

  @Post(':id/items')
  @Roles('sysadmin', 'manager')
  addItem(@Param('id') spaceId: string, @Body() dto: Omit<SaveSpaceItemDto, 'spaceId'>) {
    return this.saveItem.execute({ ...dto, spaceId });
  }

  @Put(':id/items/:itemId')
  @Roles('sysadmin', 'manager')
  updateItem(
    @Param('id') spaceId: string,
    @Param('itemId') itemId: string,
    @Body() dto: Omit<SaveSpaceItemDto, 'spaceId'>,
  ) {
    return this.saveItem.execute({ ...dto, spaceId, id: itemId });
  }

  @Delete(':id/items/:itemId')
  @Roles('sysadmin', 'manager')
  removeItem(@Param('itemId') itemId: string) {
    return this.deleteItem.execute(itemId);
  }
}
