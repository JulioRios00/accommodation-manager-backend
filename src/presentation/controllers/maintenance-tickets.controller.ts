import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Query, Request } from '@nestjs/common';
import { GetMaintenanceTicketsUseCase } from '../../application/use-cases/get-maintenance-tickets.use-case';
import { SaveMaintenanceTicketUseCase, SaveMaintenanceTicketDto } from '../../application/use-cases/save-maintenance-ticket.use-case';
import { DeleteMaintenanceTicketUseCase } from '../../application/use-cases/delete-maintenance-ticket.use-case';
import { AddTicketActivityUseCase, AddTicketActivityDto } from '../../application/use-cases/add-ticket-activity.use-case';
import { ClaimTicketUseCase } from '../../application/use-cases/claim-ticket.use-case';
import { CloseTicketUseCase } from '../../application/use-cases/close-ticket.use-case';
import { IMaintenanceTicketRepository, MAINTENANCE_TICKET_REPOSITORY } from '../../domain/maintenance-ticket/maintenance-ticket.repository';
import { Roles } from '../decorators/roles.decorator';

@Controller('maintenance-tickets')
export class MaintenanceTicketsController {
  constructor(
    private readonly getTickets: GetMaintenanceTicketsUseCase,
    private readonly saveTicket: SaveMaintenanceTicketUseCase,
    private readonly deleteTicket: DeleteMaintenanceTicketUseCase,
    private readonly addActivity: AddTicketActivityUseCase,
    private readonly claimTicket: ClaimTicketUseCase,
    private readonly closeTicket: CloseTicketUseCase,
    @Inject(MAINTENANCE_TICKET_REPOSITORY) private readonly ticketRepo: IMaintenanceTicketRepository,
  ) {}

  @Get()
  async findAll(
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: string,
    @Query('urgency') urgency?: string,
  ) {
    return this.getTickets.execute({ propertyId, status, urgency });
  }

  @Get('queue')
  async getQueue() {
    return this.ticketRepo.findQueue();
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

  @Post(':id/claim')
  @Roles('sysadmin', 'manager', 'administrator')
  async claim(@Param('id') ticketId: string, @Request() req: any) {
    return this.claimTicket.execute({
      ticketId,
      clerkUserId: req.auth?.sub ?? null,
      clerkUserName: req.auth?.metadata?.fullName ?? null,
    });
  }

  @Post(':id/close')
  @Roles('sysadmin', 'manager', 'administrator')
  async close(@Param('id') ticketId: string, @Body() body: { resolutionNotes?: string }, @Request() req: any) {
    return this.closeTicket.execute({
      ticketId,
      resolutionNotes: body?.resolutionNotes ?? null,
      clerkUserId: req.auth?.sub ?? null,
      clerkUserName: req.auth?.metadata?.fullName ?? null,
    });
  }
}
