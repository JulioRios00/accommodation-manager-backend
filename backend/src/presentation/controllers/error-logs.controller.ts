import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ERROR_LOG_REPOSITORY, IErrorLogRepository } from '../../domain/error-log/error-log.repository';
import { Roles } from '../decorators/roles.decorator';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { Actor } from '../../application/services/audit-log.service';

@Controller('error-logs')
@Roles('sysadmin', 'manager')
export class ErrorLogsController {
  constructor(@Inject(ERROR_LOG_REPOSITORY) private readonly repo: IErrorLogRepository) {}

  @Post()
  async logError(@Body() body: { message: string; stack?: string; severity?: string; context: string; userId?: string; userName?: string; statusCode?: number; url?: string; method?: string }) {
    return this.repo.logError({
      message: body.message,
      stack: body.stack,
      severity: (body.severity as any) || 'error',
      context: body.context,
      userId: body.userId,
      userName: body.userName,
      statusCode: body.statusCode,
      url: body.url,
      method: body.method,
    });
  }

  @Get()
  async list(@Query('resolved') resolved?: string, @Query('limit') limit = 25, @Query('offset') offset = 0) {
    if (resolved === 'false') return this.repo.findUnresolved(limit, offset);
    return this.repo.findAll(limit, offset);
  }

  @Get('search')
  async search(@Query('q') q: string) {
    if (!q || q.length < 2) return [];
    return this.repo.search(q);
  }

  @Get(':id')
  async getError(@Param('id') id: string) {
    return this.repo.findById(id);
  }

  @Put(':id/resolve')
  async resolve(@Param('id') id: string, @Body() body: { notes?: string }, @CurrentActor() actor: Actor) {
    return this.repo.resolve(id, actor.userId, body.notes);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.repo.delete(id);
    return { success: true };
  }
}
