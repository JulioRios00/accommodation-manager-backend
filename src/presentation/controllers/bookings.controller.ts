import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { GetBookingsUseCase } from '../../application/use-cases/get-bookings.use-case';
import { SaveBookingUseCase, SaveBookingDto } from '../../application/use-cases/save-booking.use-case';
import { DeleteBookingUseCase } from '../../application/use-cases/delete-booking.use-case';
import { BookingStatus } from '../../domain/booking/booking.entity';
import { Roles } from '../decorators/roles.decorator';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { Actor } from '../../application/services/audit-log.service';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly getBookings: GetBookingsUseCase,
    private readonly saveBooking: SaveBookingUseCase,
    private readonly deleteBooking: DeleteBookingUseCase,
  ) {}

  @Get()
  async findAll(@Query('status') status?: BookingStatus) {
    return this.getBookings.execute(status);
  }

  @Post()
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async create(@Body() dto: SaveBookingDto, @CurrentActor() actor?: Actor) {
    return this.saveBooking.execute(dto, actor);
  }

  @Put(':id')
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async update(@Param('id') id: string, @Body() dto: SaveBookingDto, @CurrentActor() actor?: Actor) {
    return this.saveBooking.execute({ ...dto, id }, actor);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager', 'administrator', 'staff', 'maintenance')
  async remove(@Param('id') id: string, @CurrentActor() actor?: Actor) {
    await this.deleteBooking.execute(id, actor);
  }
}
