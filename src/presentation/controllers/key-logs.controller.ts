import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { GetKeyLogsUseCase } from '../../application/use-cases/get-key-logs.use-case';
import { SaveKeyLogUseCase, SaveKeyLogDto } from '../../application/use-cases/save-key-log.use-case';
import { DeleteKeyLogUseCase } from '../../application/use-cases/delete-key-log.use-case';
import { Roles } from '../decorators/roles.decorator';

@Controller('key-logs')
export class KeyLogsController {
  constructor(
    private readonly getKeyLogs: GetKeyLogsUseCase,
    private readonly saveKeyLog: SaveKeyLogUseCase,
    private readonly deleteKeyLog: DeleteKeyLogUseCase,
  ) {}

  @Get()
  async findAll(@Query('propertyId') propertyId?: string) {
    return this.getKeyLogs.execute(propertyId);
  }

  @Post()
  @Roles('sysadmin', 'manager', 'administrator')
  async create(@Body() dto: SaveKeyLogDto) { return this.saveKeyLog.execute(dto); }

  @Put(':id')
  @Roles('sysadmin', 'manager', 'administrator')
  async update(@Param('id') id: string, @Body() dto: SaveKeyLogDto) {
    return this.saveKeyLog.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager')
  async remove(@Param('id') id: string) { await this.deleteKeyLog.execute(id); }
}
