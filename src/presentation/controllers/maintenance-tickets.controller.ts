import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Request } from '@nestjs/common';
import { GetMaintenanceTicketsUseCase } from '../../application/use-cases/get-maintenance-tickets.use-case';
import { SaveMaintenanceTicketUseCase, SaveMaintenanceTicketDto } from '../../application/use-cases/save-maintenance-ticket.use-case';
import { DeleteMaintenanceTicketUseCase } from '../../application/use-cases/delete-maintenance-ticket.use-case';
import { AddTicketActivityUseCase, AddTicketActivityDto } from '../../application/use-cases/add-ticket-activity.use-case';
import { Roles } from '../decorators/roles.decorator';

@Controller('maintenance-tickets')
export class MaintenanceTicketsController {
  constructor(
    private readonly getTickets: GetMaintenanceTicketsUseCase,
    private readonly saveTicket: SaveMaintenanceTicketUseCase,
    private readonly deleteTicket: DeleteMaintenanceTicketUseCase,
    private readonly addActivity: AddTicketActivityUseCase,
  ) {}

  @Get()
  async findAll(
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: string,
    @Query('urgency') urgency?: string,
  ) {
    return this.getTickets.execute({ propertyId, status, urgency });
  }

  @Post()
  @Roles('sysadmin', 'manager')
  async create(@Body() dto: SaveMaintenanceTicketDto, @Request() req: any) {
    return this.saveTicket.execute({
      ...dto,
      clerkUserId: req.auth?.sub ?? null,
      clerkUserName: req.auth?.metadata?.fullName ?? null,
    });
  }

  @Put(':id')
  @Roles('sysadmin', 'manager', 'administrator')
  async update(@Param('id') id: string, @Body() dto: SaveMaintenanceTicketDto) {
    return this.saveTicket.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager')
  async remove(@Param('id') id: string) { await this.deleteTicket.execute(id); }

  @Post(':id/activity')
  @Roles('sysadmin', 'manager', 'administrator')
  async addLog(@Param('id') ticketId: string, @Body() dto: AddTicketActivityDto, @Request() req: any) {
    return this.addActivity.execute({
      ...dto,
      ticketId,
      clerkUserId: req.auth?.sub ?? null,
      clerkUserName: req.auth?.metadata?.fullName ?? null,
    });
  }
}
