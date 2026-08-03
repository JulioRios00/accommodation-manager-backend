import { Body, Controller, Get, Inject, NotFoundException, Post, Request, ForbiddenException } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { IResidentRepository, RESIDENT_REPOSITORY } from '../../domain/resident/resident.repository';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../domain/booking/booking.repository';
import { IBedRepository, BED_REPOSITORY } from '../../domain/bed/bed.repository';
import { IPropertyRepository, PROPERTY_REPOSITORY } from '../../domain/property/property.repository';
import { SubmitResidentTicketUseCase } from '../../application/use-cases/submit-resident-ticket.use-case';

export interface SubmitTicketBody {
  category: string;
  title: string;
  description?: string | null;
}

@Controller('portal')
@Roles('resident')
export class PortalController {
  constructor(
    @Inject(RESIDENT_REPOSITORY) private readonly residentRepo: IResidentRepository,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepo: IBookingRepository,
    @Inject(BED_REPOSITORY) private readonly bedRepo: IBedRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepo: IPropertyRepository,
    private readonly submitResidentTicket: SubmitResidentTicketUseCase,
  ) {}

  @Get('me')
  async getProfile(@Request() req: any) {
    const clerkUserId: string = req.auth?.sub;
    if (!clerkUserId) throw new ForbiddenException();

    const resident = await this.residentRepo.findByClerkUserId(clerkUserId);
    if (!resident) throw new NotFoundException('No resident profile linked to this account');

    const booking = await this.bookingRepo.findActiveByResidentId(resident.id);
    if (!booking) {
      return { resident, booking: null };
    }

    const bed = await this.bedRepo.findById(booking.bedId);
    const property = bed ? await this.propertyRepo.findById(bed.propertyId) : null;

    return {
      resident,
      booking: {
        id: booking.id,
        checkInDate: booking.checkInDate,
        contractEndDate: booking.contractEndDate,
        rentAmount: booking.rentAmount,
        depositAmount: booking.depositAmount,
        bed: bed ? { id: bed.id, bedNumber: bed.bedNumber, bedroomType: bed.bedroomType } : null,
        property: property ? { id: property.id, code: property.code, fullAddress: property.fullAddress } : null,
      },
    };
  }

  @Post('tickets')
  async raiseTicket(@Body() body: SubmitTicketBody, @Request() req: any) {
    const clerkUserId: string = req.auth?.sub;
    if (!clerkUserId) throw new ForbiddenException();

    return this.submitResidentTicket.execute({
      clerkUserId,
      category: body.category,
      title: body.title,
      description: body.description ?? null,
    });
  }
}
