import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { GetBookingsUseCase } from '../../application/use-cases/get-bookings.use-case';
import { SaveBookingUseCase, SaveBookingDto } from '../../application/use-cases/save-booking.use-case';
import { DeleteBookingUseCase } from '../../application/use-cases/delete-booking.use-case';
import { BookingStatus } from '../../domain/booking/booking.entity';
import { Roles } from '../decorators/roles.decorator';

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
  @Roles('sysadmin', 'manager')
  async create(@Body() dto: SaveBookingDto) {
    return this.saveBooking.execute(dto);
  }

  @Put(':id')
  @Roles('sysadmin', 'manager')
  async update(@Param('id') id: string, @Body() dto: SaveBookingDto) {
    return this.saveBooking.execute({ ...dto, id });
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('sysadmin', 'manager')
  async remove(@Param('id') id: string) {
    await this.deleteBooking.execute(id);
  }
}
