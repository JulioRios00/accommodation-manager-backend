import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { GetBedsUseCase } from '../../application/use-cases/get-beds.use-case';
import { SaveBedUseCase, SaveBedDto } from '../../application/use-cases/save-bed.use-case';
import { DeleteBedUseCase } from '../../application/use-cases/delete-bed.use-case';
import { BedActivation, SetBedStatusUseCase } from '../../application/use-cases/set-bed-status.use-case';
import { Roles } from '../decorators/roles.decorator';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { Actor } from '../../application/services/audit-log.service';

@Controller('beds')
export class BedsController {
  constructor(
    private readonly getBeds: GetBedsUseCase,
    private readonly saveBed: SaveBedUseCase,
    private readonly deleteBed: DeleteBedUseCase,
    private readonly setBedStatus: SetBedStatusUseCase,
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

  /**
   * Takes a bed out of lettable stock, or puts it back.
   *
   * Its own route rather than part of PUT :id because it is not an edit of the bed's
   * details: it marks the status as manually owned, which stops the importer from
   * changing it, and a full-object PUT would do that on every unrelated field change.
   */
  @Patch(':id/activation')
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async setActivation(
    @Param('id') id: string,
    @Body('action') action: unknown,
    @CurrentActor() actor?: Actor,
  ) {
    if (action !== 'activate' && action !== 'deactivate') {
      throw new BadRequestException("action must be 'activate' or 'deactivate'");
    }
    return this.setBedStatus.execute(id, action as BedActivation, actor);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async remove(@Param('id') id: string, @CurrentActor() actor?: Actor) {
    await this.deleteBed.execute(id, actor);
  }
}
