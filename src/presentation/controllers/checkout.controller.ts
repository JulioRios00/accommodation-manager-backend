import { Body, Controller, Post, Request } from '@nestjs/common';
import { CheckoutUseCase, CheckoutDto } from '../../application/use-cases/checkout.use-case';
import { Roles } from '../decorators/roles.decorator';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutUseCase: CheckoutUseCase) {}

  @Post()
  @Roles('sysadmin', 'manager', 'administrator')
  async checkout(@Body() dto: CheckoutDto, @Request() req: any) {
    return this.checkoutUseCase.execute({
      ...dto,
      processedBy: dto.processedBy ?? req.auth?.sub ?? null,
      processedByName: dto.processedByName ?? req.auth?.metadata?.fullName ?? null,
    });
  }
}
